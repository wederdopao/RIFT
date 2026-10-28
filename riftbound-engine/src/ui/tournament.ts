// Torneio entre amigos: a lógica pura (sem tela, sem rede, sem armazenamento) — chave da eliminação simples com
// "bye", tabela dos pontos corridos com desempates, melhor de 1 ou de 3, resultados, W.O. e correções.
//
// O organizador guarda o torneio "oficial" e é o único que aplica mudanças (estas funções); os outros recebem cópias
// (tournamentsync.ts) e só desenham. Tudo o que chega de outro aparelho passa por `cleanTournament`.
import { cleanText } from './online';

export type TourFormat = 'elim' | 'rr';
/** O que é público do deck de cada um (a lista inteira só sai na sala da partida, como numa sala normal). */
export interface TourDeck {
  name: string;
  legend: string;
  champion: string;
}
export interface TourPlayer {
  /** identidade do aparelho (a mesma do envelope das mensagens: clientId em online.ts) */
  id: string;
  name: string;
  deck: TourDeck | null;
  /** posição no sorteio (1 = primeiro cabeça de chave); 0 antes de começar */
  seed: number;
}
/** Uma partida (jogo) de um confronto. `w`: 0 = venceu o lado a, 1 = o lado b. */
export interface TourGame {
  /** semente da partida (identifica a partida: o mesmo resultado chega dos dois jogadores) */
  seed: number;
  w: 0 | 1;
  /** pontos da partida de cada lado [a, b] */
  pts: [number, number];
  turns?: number;
  /** o organizador tem o replay (cfg + respostas) */
  rp?: boolean;
  /** 'play' = veio da sala; 'fix' = lançado/corrigido pelo organizador */
  how: 'play' | 'fix';
  /** decks usados nessa partida [a, b] */
  decks?: [TourDeck | null, TourDeck | null];
  at: number;
}
export interface TourMatch {
  /** 'r<rodada>m<posição>' */
  id: string;
  round: number;
  slot: number;
  a: string | null;
  b: string | null;
  games: TourGame[];
  /** W.O.: quem venceu sem jogar (lado) */
  wo?: 'a' | 'b';
  /** eliminação, 1ª rodada: um dos lados é "bye" (passa direto) */
  bye?: boolean;
}
export interface Tournament {
  v: 1;
  code: string;
  name: string;
  /** id e nome do organizador (ele pode jogar ou não) */
  org: string;
  orgName: string;
  format: TourFormat;
  bestOf: 1 | 3;
  /** cada um pode trocar de deck entre os confrontos */
  deckChange: boolean;
  /** formato das cartas: casual (banidas liberadas) ou padrão */
  cards: 'casual' | 'padrao';
  status: 'lobby' | 'running' | 'done';
  players: TourPlayer[];
  matches: TourMatch[];
  /** número de rodadas */
  rounds: number;
  /** versão do estado: o organizador soma 1 a cada mudança; as cópias só aceitam versão maior */
  rev: number;
  created: number;
  started?: number;
  finished?: number;
  champion?: string;
  /** deck do campeão no último confronto */
  champDeck?: TourDeck | null;
}

export const MAX_PLAYERS = 16;

export function newTournament(o: {
  code: string;
  name: string;
  org: string;
  orgName: string;
  format: TourFormat;
  bestOf: 1 | 3;
  deckChange: boolean;
  cards: 'casual' | 'padrao';
  now?: number;
}): Tournament {
  return {
    v: 1,
    code: o.code,
    name: cleanText(o.name, 40) || `Torneio de ${o.orgName}`,
    org: o.org,
    orgName: cleanText(o.orgName, 20) || 'Organizador',
    format: o.format,
    bestOf: o.bestOf,
    deckChange: o.deckChange,
    cards: o.cards,
    status: 'lobby',
    players: [],
    matches: [],
    rounds: 0,
    rev: 1,
    created: o.now ?? Date.now(),
  };
}

// ───────────────────────────── inscrição ─────────────────────────────
const bump = (t: Tournament) => {
  t.rev++;
  return true;
};
const sameDeck = (a: TourDeck | null, b: TourDeck | null) => (a?.name ?? '') === (b?.name ?? '') && (a?.legend ?? '') === (b?.legend ?? '') && (a?.champion ?? '') === (b?.champion ?? '');

/** Entra (ou atualiza nome/deck) antes de começar. Depois de começar, só troca o deck (se o torneio deixar). */
export function joinPlayer(t: Tournament, id: string, name: string, deck: TourDeck | null): { ok: boolean; changed: boolean; msg?: string } {
  const p = t.players.find((x) => x.id === id);
  const nm = cleanText(name, 20) || 'Jogador';
  if (t.status !== 'lobby') {
    if (!p) return { ok: false, changed: false, msg: 'As inscrições deste torneio já fecharam: você está só acompanhando.' };
    if (!deck || sameDeck(p.deck, deck)) return { ok: true, changed: false };
    if (!t.deckChange || t.status === 'done') return { ok: false, changed: false, msg: 'Neste torneio o deck não muda depois de começar.' };
    p.deck = deck;
    return { ok: true, changed: bump(t) };
  }
  if (p) {
    if (p.name === nm && sameDeck(p.deck, deck)) return { ok: true, changed: false };
    p.name = nm;
    p.deck = deck;
    return { ok: true, changed: bump(t) };
  }
  if (t.players.length >= MAX_PLAYERS) return { ok: false, changed: false, msg: `O torneio já tem ${MAX_PLAYERS} participantes.` };
  t.players.push({ id, name: nm, deck, seed: 0 });
  return { ok: true, changed: bump(t) };
}
/** Sai (ou o organizador tira) — só antes de começar. */
export function removePlayer(t: Tournament, id: string): boolean {
  if (t.status !== 'lobby') return false;
  const n = t.players.length;
  t.players = t.players.filter((p) => p.id !== id);
  return t.players.length !== n && bump(t);
}

// ───────────────────────────── sorteio e chave ─────────────────────────────
/** Ordem das posições na chave de tamanho `size` (potência de 2): 1×size, depois os cabeças se encontram só no fim. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}
export const nextPow2 = (n: number) => {
  let s = 1;
  while (s < n) s *= 2;
  return s;
};
/** Rodízio (método do círculo): cada par uma vez; com número ímpar, um folga por rodada. */
export function roundRobin(ids: string[]): [string, string][][] {
  const list: (string | null)[] = [...ids];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = list[i];
      const y = list[n - 1 - i];
      if (x && y) pairs.push(r % 2 && i === 0 ? [y, x] : [x, y]); // o fixo alterna o lado
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop()!); // gira todos menos o primeiro
  }
  return rounds;
}

/** Começa: sorteia a ordem (rng em [0,1)) e monta a chave ou a tabela de jogos. */
export function startTournament(t: Tournament, rng: () => number = Math.random, now = Date.now()): { ok: boolean; msg?: string } {
  if (t.status !== 'lobby') return { ok: false, msg: 'O torneio já começou.' };
  if (t.players.length < 2) return { ok: false, msg: 'São precisos pelo menos 2 participantes.' };
  const noDeck = t.players.find((p) => !p.deck);
  if (noDeck) return { ok: false, msg: `${noDeck.name} ainda não escolheu o deck.` };
  const ps = [...t.players];
  for (let i = ps.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ps[i], ps[j]] = [ps[j], ps[i]];
  }
  ps.forEach((p, i) => (p.seed = i + 1));
  t.players = ps;
  t.matches = [];
  if (t.format === 'elim') {
    const size = nextPow2(ps.length);
    t.rounds = Math.log2(size);
    const order = seedOrder(size);
    for (let r = 0; r < t.rounds; r++) {
      const count = size >> (r + 1);
      for (let s = 0; s < count; s++) {
        const m: TourMatch = { id: `r${r}m${s}`, round: r, slot: s, a: null, b: null, games: [] };
        if (r === 0) {
          const sa = order[2 * s];
          const sb = order[2 * s + 1];
          m.a = ps[sa - 1]?.id ?? null;
          m.b = ps[sb - 1]?.id ?? null;
          if (!m.a || !m.b) m.bye = true;
          if (!m.a) [m.a, m.b] = [m.b, m.a]; // o bye fica sempre no lado b
        }
        t.matches.push(m);
      }
    }
  } else {
    const rounds = roundRobin(ps.map((p) => p.id));
    t.rounds = rounds.length;
    rounds.forEach((pairs, r) => pairs.forEach(([a, b], s) => t.matches.push({ id: `r${r}m${s}`, round: r, slot: s, a, b, games: [] })));
  }
  t.status = 'running';
  t.started = now;
  settle(t, now);
  bump(t);
  return { ok: true };
}

// ───────────────────────────── resultados ─────────────────────────────
export const winsNeeded = (t: Tournament) => (t.bestOf === 3 ? 2 : 1);
/** Vitórias de cada lado nas partidas do confronto. */
export function gameWins(m: TourMatch): [number, number] {
  const w: [number, number] = [0, 0];
  for (const g of m.games) w[g.w]++;
  return w;
}
/** Quem venceu o confronto (id), ou null se ainda não acabou. */
export function matchWinner(t: Tournament, m: TourMatch): string | null {
  if (!m.a) return null;
  if (m.bye) return m.a;
  if (!m.b) return null;
  if (m.wo) return m.wo === 'a' ? m.a : m.b;
  const [wa, wb] = gameWins(m);
  const need = winsNeeded(t);
  return wa >= need ? m.a : wb >= need ? m.b : null;
}
export const matchLoser = (t: Tournament, m: TourMatch): string | null => {
  const w = matchWinner(t, m);
  return !w || m.bye ? null : w === m.a ? m.b : m.a;
};
/** Confronto pronto para jogar: os dois lados definidos e ainda sem vencedor. */
export const matchReady = (t: Tournament, m: TourMatch) => t.status === 'running' && !!m.a && !!m.b && !m.bye && !matchWinner(t, m);

/**
 * Recalcula o que depende dos resultados: na eliminação, quem passa para a rodada seguinte (um confronto cujos lados
 * mudaram por uma correção perde as partidas que tinha); no fim, o campeão e o deck dele.
 */
export function settle(t: Tournament, now = Date.now()) {
  if (t.status === 'lobby') return;
  if (t.format === 'elim') {
    for (let r = 1; r < t.rounds; r++)
      for (const m of t.matches.filter((x) => x.round === r)) {
        const fa = t.matches.find((x) => x.round === r - 1 && x.slot === 2 * m.slot);
        const fb = t.matches.find((x) => x.round === r - 1 && x.slot === 2 * m.slot + 1);
        const a = fa ? matchWinner(t, fa) : null;
        const b = fb ? matchWinner(t, fb) : null;
        if (m.a !== a || m.b !== b) {
          m.a = a;
          m.b = b;
          m.games = [];
          delete m.wo;
        }
      }
  }
  const champ = championOf(t);
  if (champ) {
    if (t.status !== 'done' || t.champion !== champ) {
      t.status = 'done';
      t.champion = champ;
      t.finished = t.finished ?? now;
    }
    t.champDeck = deckInLastMatch(t, champ);
  } else {
    t.status = 'running';
    delete t.champion;
    delete t.champDeck;
    delete t.finished;
  }
}
function championOf(t: Tournament): string | null {
  if (t.format === 'elim') {
    const fin = t.matches.find((m) => m.round === t.rounds - 1);
    return fin ? matchWinner(t, fin) : null;
  }
  if (!t.matches.length || t.matches.some((m) => !matchWinner(t, m))) return null;
  return standings(t)[0]?.id ?? null;
}
/** O deck que o jogador usou no último confronto em que jogou (ou o inscrito). */
function deckInLastMatch(t: Tournament, id: string): TourDeck | null {
  const ms = [...t.matches].sort((x, y) => x.round - y.round || x.slot - y.slot);
  for (let k = ms.length - 1; k >= 0; k--) {
    const m = ms[k];
    if (m.a !== id && m.b !== id) continue;
    const side = m.a === id ? 0 : 1;
    for (let g = m.games.length - 1; g >= 0; g--) {
      const d = m.games[g].decks?.[side];
      if (d) return d;
    }
  }
  return t.players.find((p) => p.id === id)?.deck ?? null;
}

/**
 * Resultado de uma partida jogada numa sala do torneio. Só vale para confronto pronto, com os mesmos dois lados, de
 * quem jogou (ou do organizador), uma vez por partida (semente).
 */
export function reportGame(t: Tournament, mid: string, from: string, r: { seed: number; a: string; b: string; w: 0 | 1; pts: [number, number]; turns?: number; rp?: boolean; decks?: [TourDeck | null, TourDeck | null] }, now = Date.now()): { ok: boolean; msg?: string } {
  const m = t.matches.find((x) => x.id === mid);
  if (!m) return { ok: false, msg: 'confronto inexistente' };
  if (from !== t.org && from !== m.a && from !== m.b) return { ok: false, msg: 'só quem jogou relata o resultado' };
  if (m.a !== r.a || m.b !== r.b) return { ok: false, msg: 'os lados não batem' };
  if (m.games.some((g) => g.seed === r.seed)) return { ok: true }; // já contada (chega dos dois jogadores)
  if (!matchReady(t, m)) return { ok: false, msg: 'confronto já decidido' };
  m.games.push({ seed: r.seed, w: r.w, pts: r.pts, turns: r.turns, rp: r.rp, how: 'play', decks: r.decks, at: now });
  settle(t, now);
  bump(t);
  return { ok: true };
}
/** O replay de uma partida já contada chegou depois (o organizador marca que tem). */
export function markReplay(t: Tournament, seed: number): boolean {
  for (const m of t.matches) for (const g of m.games) if (g.seed === seed && !g.rp) return (g.rp = true), bump(t);
  return false;
}

/**
 * Organizador: corrige o confronto. `games` substitui as partidas (vencedor e pontos de cada uma; as jogadas guardam o
 * replay); `wo` dá a vitória sem jogar; os dois vazios limpam o resultado.
 */
export function fixMatch(t: Tournament, mid: string, games: { w: 0 | 1; pts: [number, number]; seed?: number }[], wo?: 'a' | 'b', now = Date.now()): { ok: boolean; msg?: string } {
  const m = t.matches.find((x) => x.id === mid);
  if (!m || t.status === 'lobby') return { ok: false, msg: 'confronto inexistente' };
  if (!m.a || !m.b || m.bye) return { ok: false, msg: 'confronto sem os dois lados' };
  if (games.length > 2 * winsNeeded(t) - 1) return { ok: false, msg: 'partidas demais para o formato' };
  const need = winsNeeded(t);
  const w: [number, number] = [0, 0];
  for (const g of games) {
    if (w[0] >= need || w[1] >= need) return { ok: false, msg: 'partida depois de o confronto ter acabado' };
    w[g.w]++;
  }
  const old = new Map(m.games.map((g) => [g.seed, g]));
  m.games = games.map((g, i) => {
    const prev = g.seed !== undefined ? old.get(g.seed) : undefined;
    const pts: [number, number] = [clampPts(g.pts[0]), clampPts(g.pts[1])];
    if (prev && prev.w === g.w && prev.pts[0] === pts[0] && prev.pts[1] === pts[1]) return prev;
    return { ...(prev ?? {}), seed: prev?.seed ?? -(now + i), w: g.w, pts, how: 'fix' as const, at: now };
  });
  if (wo) {
    m.games = [];
    m.wo = wo;
  } else delete m.wo;
  settle(t, now);
  bump(t);
  return { ok: true };
}
const clampPts = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(99, Math.floor(n))) : 0);

// ───────────────────────────── tabela (pontos corridos) ─────────────────────────────
export interface Standing {
  id: string;
  name: string;
  seed: number;
  /** confrontos decididos, vitórias, derrotas */
  played: number;
  w: number;
  l: number;
  /** pontos na tabela: vitória = 3 */
  pts: number;
  /** partidas (jogos) ganhas e perdidas — no melhor de 3 */
  gw: number;
  gl: number;
  /** pontos de partida feitos e sofridos; saldo = pf - pa */
  pf: number;
  pa: number;
  /** pontos nos confrontos diretos entre os empatados (só preenchido para quem empatou) */
  h2h?: number;
}
export const WIN_POINTS = 3;

/** Tabela: pontos; empate → confronto direto (entre os empatados) → saldo de pontos de partida → pontos feitos → sorteio. */
export function standings(t: Tournament): Standing[] {
  const rows = new Map<string, Standing>(t.players.map((p) => [p.id, { id: p.id, name: p.name, seed: p.seed, played: 0, w: 0, l: 0, pts: 0, gw: 0, gl: 0, pf: 0, pa: 0 }]));
  for (const m of t.matches) {
    const win = matchWinner(t, m);
    if (!win || m.bye || !m.a || !m.b) continue;
    const A = rows.get(m.a);
    const B = rows.get(m.b);
    if (!A || !B) continue;
    A.played++;
    B.played++;
    const W = win === m.a ? A : B;
    const L = win === m.a ? B : A;
    W.w++;
    W.pts += WIN_POINTS;
    L.l++;
    for (const g of m.games) {
      A.pf += g.pts[0];
      A.pa += g.pts[1];
      B.pf += g.pts[1];
      B.pa += g.pts[0];
      (g.w === 0 ? A : B).gw++;
      (g.w === 0 ? B : A).gl++;
    }
  }
  const list = [...rows.values()];
  // confronto direto: pontos ganhos só nos confrontos entre os empatados em pontos
  const byPts = new Map<number, Standing[]>();
  for (const s of list) byPts.set(s.pts, [...(byPts.get(s.pts) ?? []), s]);
  for (const group of byPts.values()) {
    if (group.length < 2) continue;
    const ids = new Set(group.map((s) => s.id));
    for (const s of group) s.h2h = 0;
    for (const m of t.matches) {
      if (!m.a || !m.b || !ids.has(m.a) || !ids.has(m.b)) continue;
      const win = matchWinner(t, m);
      if (win) rows.get(win)!.h2h! += WIN_POINTS;
    }
  }
  return list.sort((x, y) => y.pts - x.pts || (y.h2h ?? 0) - (x.h2h ?? 0) || y.pf - y.pa - (x.pf - x.pa) || y.pf - x.pf || x.seed - y.seed);
}

// ───────────────────────────── leitura ─────────────────────────────
export const playerName = (t: Tournament, id: string | null) => (id ? t.players.find((p) => p.id === id)?.name ?? '?' : '');
export const playerOf = (t: Tournament, id: string | null) => (id ? t.players.find((p) => p.id === id) ?? null : null);
/** Nome da rodada na eliminação. */
export function roundName(t: Tournament, r: number): string {
  if (t.format === 'rr') return `Rodada ${r + 1}`;
  const left = t.rounds - r;
  return left === 1 ? 'Final' : left === 2 ? 'Semifinal' : left === 3 ? 'Quartas de final' : left === 4 ? 'Oitavas de final' : `Rodada ${r + 1}`;
}
/** Pontos corridos: quem folga na rodada (número ímpar de participantes). */
export function restingIn(t: Tournament, r: number): string | null {
  if (t.format !== 'rr' || t.players.length % 2 === 0) return null;
  const busy = new Set(t.matches.filter((m) => m.round === r).flatMap((m) => [m.a, m.b]));
  return t.players.find((p) => !busy.has(p.id))?.id ?? null;
}

// ───────────────────────────── o que chega de outro aparelho ─────────────────────────────
const str = (v: unknown, max: number) => cleanText(v, max);
const int = (v: unknown, lo: number, hi: number, d = lo) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
const id = (v: unknown) => String(v ?? '').replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 40);
export function cleanDeck(x: any): TourDeck | null {
  if (!x || typeof x !== 'object') return null;
  const code = (v: unknown) => String(v ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 16);
  const d = { name: str(x.name, 40) || 'Deck', legend: code(x.legend), champion: code(x.champion) };
  return d;
}
/** Estado de torneio vindo da rede: confere tipos e tamanhos (null se não servir). */
export function cleanTournament(x: any): Tournament | null {
  if (!x || typeof x !== 'object' || x.v !== 1) return null;
  const code = String(x.code ?? '').replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length !== 6 || !id(x.org)) return null;
  if (!Array.isArray(x.players) || !Array.isArray(x.matches) || x.players.length > MAX_PLAYERS || x.matches.length > 200) return null;
  const players: TourPlayer[] = x.players.map((p: any) => ({ id: id(p?.id), name: str(p?.name, 20) || 'Jogador', deck: cleanDeck(p?.deck), seed: int(p?.seed, 0, 99) }));
  const ids = new Set(players.map((p) => p.id));
  const pid = (v: unknown) => (typeof v === 'string' && ids.has(id(v)) ? id(v) : null);
  const matches: TourMatch[] = x.matches.map((m: any) => {
    const out: TourMatch = {
      id: id(m?.id),
      round: int(m?.round, 0, 30),
      slot: int(m?.slot, 0, 99),
      a: pid(m?.a),
      b: pid(m?.b),
      games: (Array.isArray(m?.games) ? m.games.slice(0, 3) : []).map((g: any) => ({
        seed: int(g?.seed, -(2 ** 52), 2 ** 52),
        w: g?.w === 1 ? 1 : 0,
        pts: [int(g?.pts?.[0], 0, 99), int(g?.pts?.[1], 0, 99)] as [number, number],
        turns: g?.turns === undefined ? undefined : int(g.turns, 0, 999),
        rp: !!g?.rp || undefined,
        how: g?.how === 'fix' ? 'fix' : 'play',
        decks: Array.isArray(g?.decks) ? ([cleanDeck(g.decks[0]), cleanDeck(g.decks[1])] as [TourDeck | null, TourDeck | null]) : undefined,
        at: int(g?.at, 0, 2 ** 52),
      })),
    };
    if (m?.wo === 'a' || m?.wo === 'b') out.wo = m.wo;
    if (m?.bye) out.bye = true;
    return out;
  });
  const t: Tournament = {
    v: 1,
    code,
    name: str(x.name, 40) || 'Torneio',
    org: id(x.org),
    orgName: str(x.orgName, 20) || 'Organizador',
    format: x.format === 'rr' ? 'rr' : 'elim',
    bestOf: x.bestOf === 3 ? 3 : 1,
    deckChange: !!x.deckChange,
    cards: x.cards === 'padrao' ? 'padrao' : 'casual',
    status: x.status === 'running' || x.status === 'done' ? x.status : 'lobby',
    players,
    matches,
    rounds: int(x.rounds, 0, 30),
    rev: int(x.rev, 0, 2 ** 40),
    created: int(x.created, 0, 2 ** 52),
  };
  if (typeof x.started === 'number') t.started = int(x.started, 0, 2 ** 52);
  if (typeof x.finished === 'number') t.finished = int(x.finished, 0, 2 ** 52);
  if (x.champion && pid(x.champion)) t.champion = pid(x.champion)!;
  if (x.champDeck) t.champDeck = cleanDeck(x.champDeck);
  return t;
}
