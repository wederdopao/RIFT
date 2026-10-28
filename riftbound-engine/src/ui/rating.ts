// Ranking entre amigos (Elo) e o resumo de carreira da conta (para a tela de perfil). Sem DOM: os testes usam direto.
//
// Ranking: cada conta tem uma identidade estável (`RankStore.id`, sorteada uma vez e guardada na conta — vai junto no
// backup) e uma pontuação Elo que começa em 1000. Só partidas ONLINE contam. No hello/welcome cada lado manda o seu
// cartão ({id, nome, pontuação, partidas}); o anfitrião põe os dois cartões no cfg da partida (`cfg.rank`), que o
// convidado recebe completo no fim (a mesma partida que vai para o histórico). Os dois lados calculam a mudança pelo
// MESMO cfg e pelo mesmo vencedor (o anfitrião é a fonte da verdade, como na sala), com arredondamento simétrico: o
// que um ganha o outro perde, e os dois veem os mesmos números. Cada partida conta uma vez só (pela semente).
//
// Carreira: contadores de todas as partidas terminadas (IA, online, passa-e-joga) por modo, deck, lenda, adversário
// (amigo pelo id, IA pelo nível) e sequências. Conta antiga: na primeira vez começa com o que está no histórico.
import * as acc from './account';
import type { HistEntry } from './history';

/** O que um lado conta do outro no começo da partida. */
export interface RankCard {
  id: string;
  name: string;
  elo: number;
  /** partidas online já contadas no ranking */
  n: number;
}
export interface RankFriend {
  name: string;
  /** pontuação do amigo como você a viu por último */
  elo: number;
  /** suas vitórias e derrotas contra ele */
  w: number;
  l: number;
  /** sequência atual: >0 vitórias suas seguidas, <0 derrotas seguidas */
  streak: number;
  /** última partida contra ele (data) */
  last?: number;
  /** último resultado: sua mudança de pontuação */
  lastD?: number;
  /** quando o cartão dele foi visto por último */
  seen: number;
}
export interface RankLogEntry {
  at: number;
  /** id do amigo */
  opp: string;
  name: string;
  won: boolean;
  /** mudança da sua pontuação e a pontuação depois */
  d: number;
  elo: number;
  /** pontuação do amigo antes da partida */
  oe: number;
}
export interface RankStore {
  v: 1;
  id: string;
  elo: number;
  /** partidas online contadas */
  n: number;
  best: number;
  friends: Record<string, RankFriend>;
  /** partidas do ranking (mais antiga primeiro), para o gráfico */
  log: RankLogEntry[];
  /** sementes das partidas já contadas (cada partida conta uma vez) */
  seen: number[];
}
export const START_ELO = 1000;
export const K = 32;
const MAX_LOG = 300;
const MAX_SEEN = 300;

const randId = () => {
  const c = (globalThis as any).crypto;
  if (c?.getRandomValues) return [...c.getRandomValues(new Uint8Array(12))].map((b: number) => b.toString(16).padStart(2, '0')).join('');
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
};
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** Ranking da conta ativa (cria na primeira vez; conserta dado estragado sem perder o que der para aproveitar). */
export function rankStore(): RankStore {
  const p = acc.profile();
  const r = p.rank as RankStore | undefined;
  if (r && typeof r === 'object' && typeof r.id === 'string' && r.id) {
    let fixed = false;
    if (r.v !== 1) (r.v = 1), (fixed = true);
    if (!Number.isFinite(r.elo)) (r.elo = START_ELO), (fixed = true);
    if (!Number.isFinite(r.n)) (r.n = 0), (fixed = true);
    if (!Number.isFinite(r.best)) (r.best = r.elo), (fixed = true);
    if (!r.friends || typeof r.friends !== 'object') (r.friends = {}), (fixed = true);
    if (!Array.isArray(r.log)) (r.log = []), (fixed = true);
    if (!Array.isArray(r.seen)) (r.seen = []), (fixed = true);
    if (fixed) acc.persist();
    return r;
  }
  const n: RankStore = { v: 1, id: randId(), elo: START_ELO, n: 0, best: START_ELO, friends: {}, log: [], seen: [] };
  p.rank = n;
  acc.persist();
  return n;
}
/** O meu cartão (vai no hello/welcome); `name`: o nome com que estou jogando (padrão: o da conta). */
export function myCard(name?: string): RankCard {
  const r = rankStore();
  const n = (name ?? '').trim();
  return { id: r.id, name: (n && n !== 'Você' ? n : acc.profile().name).slice(0, 20), elo: r.elo, n: r.n };
}
/** Cartão que chegou pela rede: confere e limpa (null se não serve). */
export function cleanCard(x: any): RankCard | null {
  if (!x || typeof x !== 'object') return null;
  const id = typeof x.id === 'string' ? x.id.replace(/[^0-9a-z]/gi, '').slice(0, 40) : '';
  if (id.length < 8) return null;
  const elo = num(x.elo, NaN);
  if (!Number.isFinite(elo) || elo < 0 || elo > 5000) return null;
  return { id, name: String(x.name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 20) || 'Amigo', elo: Math.round(elo), n: Math.max(0, Math.floor(num(x.n, 0))) };
}

/** Probabilidade de A vencer B. */
export const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));
/** Arredondamento simétrico (o que um ganha o outro perde, inclusive no meio: 2,5 → 3 e −2,5 → −3). */
const symRound = (x: number) => Math.sign(x) * Math.round(Math.abs(x));
/** Mudança da pontuação do lugar 0 numa partida entre `e0` e `e1` (o lugar 1 muda o oposto). */
export function eloDelta0(e0: number, e1: number, winner0: boolean): number {
  return symRound(K * ((winner0 ? 1 : 0) - expected(e0, e1)));
}

/** O amigo apareceu (hello/welcome): guarda o nome e a pontuação como você viu agora. */
export function sawFriend(c: RankCard | null) {
  if (!c) return;
  const r = rankStore();
  if (c.id === r.id) return;
  const f = r.friends[c.id];
  if (f) Object.assign(f, { name: c.name, elo: c.elo, seen: Date.now() });
  else r.friends[c.id] = { name: c.name, elo: c.elo, w: 0, l: 0, streak: 0, seen: Date.now() };
  acc.persist();
}
/** O cartão do amigo com a pontuação mais nova que esta conta conhece (revanche: a da partida que acabou de contar). */
export function latestCard(c: RankCard | null | undefined): RankCard | null {
  if (!c) return null;
  const f = rankStore().friends[c.id];
  return f ? { ...c, elo: f.elo } : c;
}
/** Os dois cartões que vão no cfg da partida online (null: não conta — mesma conta dos dois lados ou sem cartão). */
export function rankForGame(host: RankCard, guest: RankCard | null): [RankCard, RankCard] | null {
  if (!guest || guest.id === host.id) return null;
  return [host, guest];
}

export interface RankResult {
  d: number;
  elo: number;
  opp: RankCard;
  oppElo: number;
  won: boolean;
}
/**
 * Conta no ranking uma partida terminada. Só vale para partida online (`mode`), com os dois cartões no cfg, um deles
 * desta conta, e uma vez por partida (semente). Devolve o resultado, ou null se não contou.
 */
export function recordRanked(mode: string, cfg: any, winner: number | null, seat: number): RankResult | null {
  if (mode !== 'online' || winner === null || (seat !== 0 && seat !== 1)) return null;
  const rk = Array.isArray(cfg?.rank) ? cfg.rank.map(cleanCard) : null;
  if (!rk || rk.length !== 2 || !rk[0] || !rk[1]) return null;
  const r = rankStore();
  const me = rk[seat] as RankCard;
  const opp = rk[1 - seat] as RankCard;
  if (me.id !== r.id || opp.id === r.id) return null; // partida de outra conta (replay de arquivo alheio) ou contra si
  const seed = Number(cfg.seed);
  if (!Number.isFinite(seed) || r.seen.includes(seed)) return null;
  r.seen.push(seed);
  if (r.seen.length > MAX_SEEN) r.seen.splice(0, r.seen.length - MAX_SEEN);
  const d0 = eloDelta0(rk[0]!.elo, rk[1]!.elo, winner === 0);
  const d = seat === 0 ? d0 : -d0;
  const won = winner === seat;
  // a minha pontuação anda a partir da que eu tenho (se alguém mexeu no cartão no caminho, não me prejudica)
  r.elo = Math.max(0, r.elo + d);
  r.n++;
  r.best = Math.max(r.best, r.elo);
  const oppElo = Math.max(0, opp.elo - d);
  const f = (r.friends[opp.id] ||= { name: opp.name, elo: opp.elo, w: 0, l: 0, streak: 0, seen: Date.now() });
  f.name = opp.name;
  f.elo = oppElo;
  if (won) {
    f.w++;
    f.streak = f.streak > 0 ? f.streak + 1 : 1;
  } else {
    f.l++;
    f.streak = f.streak < 0 ? f.streak - 1 : -1;
  }
  f.last = Date.now();
  f.lastD = d;
  r.log.push({ at: Date.now(), opp: opp.id, name: opp.name, won, d, elo: r.elo, oe: opp.elo });
  if (r.log.length > MAX_LOG) r.log.splice(0, r.log.length - MAX_LOG);
  acc.persist();
  return { d, elo: r.elo, opp, oppElo, won };
}
/** Resultado já contado desta partida (para mostrar no fim), pela semente. */
export function rankedOf(cfg: any, seat: number): RankLogEntry | null {
  const rk = Array.isArray(cfg?.rank) ? cfg.rank.map(cleanCard) : null;
  if (!rk?.[1 - seat]) return null;
  const r = rankStore();
  if (!r.seen.includes(Number(cfg.seed))) return null;
  const opp = rk[1 - seat]!.id;
  for (let i = r.log.length - 1; i >= 0; i--) if (r.log[i].opp === opp) return r.log[i];
  return null;
}

export interface RankRow {
  id: string;
  name: string;
  elo: number;
  me: boolean;
  w: number;
  l: number;
  streak: number;
  last?: number;
  lastD?: number;
}
/** Tabela do ranking: você e os amigos que já enfrentou, pela pontuação. */
export function rankTable(): RankRow[] {
  const r = rankStore();
  const rows: RankRow[] = Object.entries(r.friends)
    .filter(([, f]) => f.w + f.l > 0)
    .map(([id, f]) => ({ id, name: f.name, elo: f.elo, me: false, w: f.w, l: f.l, streak: f.streak, last: f.last, lastD: f.lastD }));
  const w = rows.reduce((a, x) => a + x.w, 0);
  const l = rows.reduce((a, x) => a + x.l, 0);
  const last = r.log.length ? r.log[r.log.length - 1] : null;
  rows.push({ id: r.id, name: acc.profile().name, elo: r.elo, me: true, w, l, streak: careerStreakOnline(), last: last?.at, lastD: last?.d });
  return rows.sort((a, b) => b.elo - a.elo || (a.me ? -1 : b.me ? 1 : a.name.localeCompare(b.name)));
}
/** Sequência atual nas partidas do ranking (vitórias > 0, derrotas < 0). */
function careerStreakOnline(): number {
  const log = rankStore().log;
  let s = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    const won = log[i].won;
    if (s === 0) s = won ? 1 : -1;
    else if (won === s > 0) s += s > 0 ? 1 : -1;
    else break;
  }
  return s;
}

// ───────────────────────────── carreira (perfil) ─────────────────────────────
export interface WL {
  g: number;
  w: number;
}
export interface Career {
  v: 1;
  /** partidas por modo (passa-e-joga conta só aqui: lá não há "você" contra alguém) */
  modes: { ai: WL; online: WL; human: WL };
  /** por deck da conta: 'my:<id>' / 'pre:<n>' / 'x:<nome>' */
  decks: Record<string, WL & { name: string; legend: string; champion: string }>;
  /** pela minha lenda */
  legends: Record<string, WL>;
  /** por adversário: 'f:<id do amigo>', 'n:<nome>' (online antigo, sem id), 'ai:<nível>' ('ai:?' sem nível) */
  opps: Record<string, WL & { name: string }>;
  /** sequências de vitória (IA e online) */
  streak: number;
  best: number;
  /** sementes já contadas */
  seen: number[];
  /** começou do histórico de uma conta antiga */
  fromHist?: number;
}
export interface CareerGame {
  seed: number;
  mode: 'ai' | 'human' | 'online';
  won: boolean;
  deckKey: string | null;
  deckName: string;
  legend: string;
  champion: string;
  opp: string;
  oppName: string;
}
const emptyCareer = (): Career => ({ v: 1, modes: { ai: { g: 0, w: 0 }, online: { g: 0, w: 0 }, human: { g: 0, w: 0 } }, decks: {}, legends: {}, opps: {}, streak: 0, best: 0, seen: [] });

/** Uma partida do histórico como fato de carreira. */
export function gameOfHist(e: HistEntry): CareerGame | null {
  if (e.winner === null || e.winner === undefined) return null;
  const seed = Number(String(e.id).split('-')[0]);
  const me = e.seat;
  const d = e.decks?.[me];
  if (!d) return null;
  const oppName = e.names?.[1 - me] || 'Adversário';
  const opp = e.mode === 'ai' ? `ai:${e.ai || '?'}` : e.mode === 'online' ? (e.opp ? `f:${e.opp}` : `n:${oppName}`) : '';
  return { seed, mode: e.mode, won: e.winner === me, deckKey: d.deck ?? null, deckName: d.name, legend: d.legend, champion: d.champion, opp, oppName };
}
/** Carreira da conta ativa; conta antiga começa com as partidas do histórico (`hist`: do mais novo ao mais antigo). */
export function career(hist?: () => HistEntry[]): Career {
  const p = acc.profile();
  const c = p.career as Career | undefined;
  if (c && c.v === 1 && c.modes && c.decks && Array.isArray(c.seen)) return c;
  const n = emptyCareer();
  p.career = n;
  const list = hist ? hist() : [];
  if (list.length) n.fromHist = list.length;
  for (const e of [...list].reverse()) {
    const g = gameOfHist(e);
    if (g) addGame(n, g);
  }
  acc.persist();
  return n;
}
function addGame(c: Career, g: CareerGame): boolean {
  if (Number.isFinite(g.seed) && c.seen.includes(g.seed)) return false;
  if (Number.isFinite(g.seed)) {
    c.seen.push(g.seed);
    if (c.seen.length > MAX_SEEN) c.seen.splice(0, c.seen.length - MAX_SEEN);
  }
  const m = c.modes[g.mode];
  if (!m) return false;
  m.g++;
  if (g.won) m.w++;
  if (g.mode === 'human') return true;
  const inc = (x: WL) => {
    x.g++;
    if (g.won) x.w++;
  };
  const dk = g.deckKey || `x:${g.deckName}`;
  inc((c.decks[dk] ||= { g: 0, w: 0, name: g.deckName, legend: g.legend, champion: g.champion }));
  Object.assign(c.decks[dk], { name: g.deckName, legend: g.legend, champion: g.champion });
  if (g.legend) inc((c.legends[g.legend] ||= { g: 0, w: 0 }));
  if (g.opp) {
    inc((c.opps[g.opp] ||= { g: 0, w: 0, name: g.oppName }));
    c.opps[g.opp].name = g.oppName;
  }
  c.streak = g.won ? c.streak + 1 : 0;
  c.best = Math.max(c.best, c.streak);
  return true;
}
/** Conta uma partida terminada na carreira (uma vez por semente). */
export function recordCareer(g: CareerGame, hist?: () => HistEntry[]): boolean {
  const c = career(hist);
  const ok = addGame(c, g);
  if (ok) acc.persist();
  return ok;
}
