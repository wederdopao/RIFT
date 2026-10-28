// Torneio entre amigos: cópias locais, canal do torneio e resultados que voltam das salas.
//
// Cada aparelho guarda os torneios na conta local (acc.tourEntries): o estado mais novo que conhece, o próprio deck
// (a lista inteira, que fica a mesma até o fim mesmo se o deck da conta mudar) e os resultados relatados que o
// organizador ainda não confirmou. O organizador é a fonte da verdade (como o anfitrião numa sala): só ele aplica
// mudanças (tournament.ts) e repassa o estado inteiro, com um número de versão (rev), pelo canal "t-<código>" — o mesmo
// transporte das salas (room no app do Claude, MQTT fora dele). Quem cai e volta reabre o canal e pede o estado; o
// organizador que cai e volta continua da cópia salva. Resultado de uma partida: quem jogou relata (os dois jogadores;
// o organizador conta uma vez, pela semente) e repete até ver o resultado no estado; o replay vai junto e fica com o
// organizador, que o manda a quem pedir.
import * as acc from './account';
import { checkDeck } from '../engine/deckcheck';
import type { DeckList } from '../engine/engine';
import type { P } from '../engine/types';
import { PROTOCOL, clientId, cleanText, newCode, openChannel, pack, unpack, type Env, type Link, type TourMsg } from './online';
import { cleanDeck, cleanTournament, fixMatch, joinPlayer, markReplay, matchWinner, newTournament, removePlayer, reportGame, startTournament, type TourDeck, type TourFormat, type Tournament } from './tournament';

/** Resultado de uma partida, relatado por quem jogou (vai ao organizador; `z` = replay empacotado). */
export interface TourReport {
  mid: string;
  seed: number;
  a: string;
  b: string;
  w: 0 | 1;
  pts: [number, number];
  turns: number;
  decks: [TourDeck | null, TourDeck | null];
  z?: string;
  at: number;
}
export interface TourEntry {
  code: string;
  /** org = organizador (pode também jogar); player = inscrito ou pedindo inscrição; watch = só acompanha */
  role: 'org' | 'player' | 'watch';
  t: Tournament | null;
  /** quero jogar (inscrição) */
  play: boolean;
  /** meu deck no torneio: a escolha da conta e a lista guardada */
  deckId?: string;
  deck?: DeckList;
  /** resultados relatados que o organizador ainda não confirmou */
  pending: TourReport[];
  /** partidas já relatadas daqui (semente) */
  sent: number[];
  at: number;
  /** última recusa do organizador */
  note?: string;
}
/** O que vai no cfg da partida jogada numa sala do torneio (o motor ignora). */
export interface TourTag {
  code: string;
  mid: string;
  a: string;
  b: string;
}
export function tourTagOf(cfg: unknown): TourTag | null {
  const t = (cfg as { tour?: Partial<TourTag> } | null | undefined)?.tour;
  return t && typeof t.code === 'string' && typeof t.mid === 'string' && typeof t.a === 'string' && typeof t.b === 'string' ? (t as TourTag) : null;
}

interface Hooks {
  /** algo mudou num torneio (a tela redesenha se estiver aberta) */
  changed(): void;
  openReplay(cfg: any, answers: string[][]): void;
}
let hooks: Hooks = { changed() {}, openReplay() {} };

export const me = () => clientId();
const myName = () => cleanText(acc.profile().name, 20) || 'Jogador';
export const deckInfo = (d: DeckList): TourDeck => ({ name: cleanText(d.name, 40) || 'Deck', legend: d.legend, champion: d.champion });
/** O deck serve para este torneio? (completo e, no Padrão, sem banidas) */
export function deckFits(d: DeckList, cards: 'casual' | 'padrao'): boolean {
  const r = checkDeck(d);
  return !r.errors.length && (cards === 'casual' || !r.banned.length);
}

// ───────────────────────────── conta local ─────────────────────────────
export const entries = (): TourEntry[] => acc.tourEntries();
export const entry = (code: string): TourEntry | null => entries().find((e) => e.code === code) ?? null;
function addEntry(e: TourEntry) {
  acc.setTourEntries([e, ...entries().filter((x) => x.code !== e.code)].slice(0, 40));
}
const save = () => acc.persist();
/** Tira um torneio da lista desta conta (o dos outros continua). */
export function forget(code: string) {
  conns.get(code)?.close();
  conns.delete(code);
  acc.setTourEntries(entries().filter((e) => e.code !== code));
  hooks.changed();
}

// replays guardados (organizador: todos os do torneio; os outros: os que jogaram ou pediram), por conta
const RP_KEY = () => `riftbound-mesa-torneio-rp:${acc.profile().id}`;
const RP_MAX = 1_200_000;
function rpStore(): Record<string, { z: string; at: number }> {
  try {
    return JSON.parse(localStorage.getItem(RP_KEY()) || '{}') || {};
  } catch {
    return {};
  }
}
function putReplay(seed: number, z: string) {
  const s = rpStore();
  s[seed] = { z, at: Date.now() };
  let keys = Object.keys(s).sort((x, y) => s[x].at - s[y].at);
  // sem espaço: os mais antigos saem primeiro
  while (keys.length > 1 && JSON.stringify(s).length > RP_MAX) delete s[keys.shift()!];
  try {
    localStorage.setItem(RP_KEY(), JSON.stringify(s));
  } catch {
    /* sem espaço: segue sem guardar */
  }
}
export const hasReplay = (seed: number) => !!rpStore()[seed];

// ───────────────────────────── organizador ─────────────────────────────
export function createTour(o: { name: string; format: TourFormat; bestOf: 1 | 3; deckChange: boolean; cards: 'casual' | 'padrao'; play: boolean; deckId?: string }): TourEntry {
  const code = newCode();
  const t = newTournament({ code, name: o.name, org: me(), orgName: myName(), format: o.format, bestOf: o.bestOf, deckChange: o.deckChange, cards: o.cards });
  const e: TourEntry = { code, role: 'org', t, play: o.play, pending: [], sent: [], at: Date.now() };
  if (o.play && o.deckId) {
    e.deckId = o.deckId;
    e.deck = acc.deckById(o.deckId);
    joinPlayer(t, me(), myName(), deckInfo(e.deck));
  }
  addEntry(e);
  syncConns();
  return e;
}
/** Organizador: grava, repassa o estado novo a todos e avisa a tela. */
function commit(e: TourEntry) {
  if (e.t) reconcile(e);
  save();
  conns.get(e.code)?.sendState();
  hooks.changed();
}
const asOrg = (code: string) => {
  const e = entry(code);
  return e && e.role === 'org' && e.t ? (e as TourEntry & { t: Tournament }) : null;
};
export function startTour(code: string): string | null {
  const e = asOrg(code);
  if (!e) return 'Só o organizador começa o torneio.';
  const r = startTournament(e.t);
  if (!r.ok) return r.msg ?? 'Não deu para começar.';
  commit(e);
  return null;
}
export function kick(code: string, pid: string) {
  const e = asOrg(code);
  if (e && removePlayer(e.t, pid)) commit(e);
}
export function fix(code: string, mid: string, games: { w: 0 | 1; pts: [number, number]; seed?: number }[], wo?: 'a' | 'b'): string | null {
  const e = asOrg(code);
  if (!e) return 'Só o organizador corrige resultados.';
  const r = fixMatch(e.t, mid, games, wo);
  if (!r.ok) return r.msg ?? 'Não deu para corrigir.';
  commit(e);
  return null;
}
/** Organizador: aplica um resultado (o próprio ou o que chegou) e guarda o replay. */
async function applyReport(e: TourEntry & { t: Tournament }, from: string, r: TourReport) {
  if (r.z) putReplay(r.seed, r.z);
  const res = reportGame(e.t, r.mid, from, { seed: r.seed, a: r.a, b: r.b, w: r.w, pts: r.pts, turns: r.turns, rp: !!r.z, decks: r.decks });
  const rp = !!r.z && markReplay(e.t, r.seed);
  if (res.ok || rp) commit(e);
}

// ───────────────────────────── participante ─────────────────────────────
/** Abre um torneio pelo código (acompanha; a inscrição é à parte). */
export function openTour(code: string): TourEntry {
  let e = entry(code);
  if (!e) {
    e = { code, role: 'watch', t: null, play: false, pending: [], sent: [], at: Date.now() };
    addEntry(e);
  }
  syncConns(code);
  return e;
}
/** Escolhe o meu deck (antes de me inscrever, ou para trocar). */
export function setMyDeck(code: string, deckId: string) {
  const e = entry(code);
  if (!e) return;
  e.deckId = deckId;
  e.deck = acc.deckById(deckId);
  e.note = '';
  if (e.role === 'org' && e.t && e.play) {
    const r = joinPlayer(e.t, me(), myName(), deckInfo(e.deck));
    e.note = r.msg ?? '';
    if (r.changed) return commit(e);
  }
  save();
  conns.get(code)?.hello();
  hooks.changed();
}
/** Inscreve-se (ou sai, antes de começar). */
export function setPlaying(code: string, play: boolean) {
  const e = entry(code);
  if (!e) return;
  e.play = play;
  e.note = '';
  if (e.role !== 'org') e.role = play ? 'player' : 'watch';
  if (e.role === 'org' && e.t) {
    const r = play && e.deck ? joinPlayer(e.t, me(), myName(), deckInfo(e.deck)) : { changed: removePlayer(e.t, me()), msg: undefined };
    e.note = r.msg ?? '';
    if (r.changed) return commit(e);
  } else if (!play) conns.get(code)?.send({ t: 'tleave' }, e.t?.org);
  save();
  conns.get(code)?.hello();
  hooks.changed();
}
/** Some do estado tudo o que o organizador já contou (ou não vai mais contar). */
function reconcile(e: TourEntry) {
  const t = e.t;
  if (!t) return;
  e.pending = e.pending.filter((r) => {
    const m = t.matches.find((x) => x.id === r.mid);
    if (!m || m.a !== r.a || m.b !== r.b) return false;
    const g = m.games.find((x) => x.seed === r.seed);
    if (g) return !!r.z && !g.rp; // contada; o replay ainda não chegou ao organizador
    return !matchWinner(t, m);
  });
  if (e.role === 'watch' && t.players.some((p) => p.id === me())) {
    e.role = 'player';
    e.play = true;
  }
}

// ───────────────────────────── resultado vindo da sala ─────────────────────────────
/**
 * Fim de uma partida numa sala do torneio (main.ts, recordIfOver): relata ao organizador uma vez por partida. `cfg`
 * leva a marca `tour`; `seat` = o meu lugar na sala (anfitrião 0 = lado a).
 */
export function tourRecord(cfg: any, answers: string[][], winner: P | null, points: [number, number], turns: number, seat: P) {
  const tag = tourTagOf(cfg);
  if (!tag || winner === null) return;
  const e = entry(tag.code);
  if (!e || e.sent.includes(cfg.seed)) return;
  if (me() !== tag.a && me() !== tag.b) return;
  void seat;
  e.sent = [...e.sent, cfg.seed].slice(-100);
  const r: TourReport = {
    mid: tag.mid,
    seed: cfg.seed,
    a: tag.a,
    b: tag.b,
    w: winner,
    pts: [points[0], points[1]],
    turns,
    decks: [deckInfo(cfg.decks[0]), deckInfo(cfg.decks[1])],
    at: Date.now(),
  };
  // o resultado vai já (o fim da partida mostra os botões certos); o replay vai depois (empacotar é assíncrono) — o
  // organizador conta a partida uma vez e só marca que tem o replay
  submit(e.code, r);
  void pack({ cfg, answers }).then(
    (z) => submit(e.code, { ...r, z }),
    () => {},
  );
}
function submit(code: string, r: TourReport) {
  const e = entry(code);
  if (!e) return;
  if (r.z) putReplay(r.seed, r.z);
  if (e.role === 'org' && e.t) return void applyReport(e as TourEntry & { t: Tournament }, me(), r);
  e.pending = [...e.pending.filter((x) => x.seed !== r.seed), r];
  save();
  conns.get(code)?.flush();
  hooks.changed();
}
/** Partidas deste confronto já jogadas aqui, contadas ou não pelo organizador (o fim da partida decide os botões). */
export function knownGames(tag: TourTag): { w: [number, number]; decided: boolean } {
  const e = entry(tag.code);
  const m = e?.t?.matches.find((x) => x.id === tag.mid);
  const w: [number, number] = [0, 0];
  if (!e?.t || !m) return { w, decided: false };
  const seen = new Set<number>();
  for (const g of m.games) w[g.w]++, seen.add(g.seed);
  for (const r of e.pending) if (r.mid === tag.mid && !seen.has(r.seed)) w[r.w]++;
  const need = e.t.bestOf === 3 ? 2 : 1;
  return { w, decided: !!matchWinner(e.t, m) || w[0] >= need || w[1] >= need };
}

// ───────────────────────────── replays ─────────────────────────────
let wantReplay: number | null = null;
/** Abre o replay de uma partida: guardado aqui ou pedido ao organizador (abre quando chegar). */
export async function openTourReplay(code: string, seed: number): Promise<'open' | 'asked' | 'none'> {
  const s = rpStore()[seed];
  if (s) {
    try {
      const r = await unpack(s.z);
      hooks.openReplay(r.cfg, r.answers);
      return 'open';
    } catch {
      /* estragado: pede de novo */
    }
  }
  const e = entry(code);
  const c = conns.get(code);
  if (!e?.t || !c || e.role === 'org') return 'none';
  wantReplay = seed;
  c.send({ t: 'trq', seed }, e.t.org);
  return 'asked';
}
export const waitingReplay = () => wantReplay;

// ───────────────────────────── canal do torneio ─────────────────────────────
/** Sem notícia do organizador por mais que isso: "organizador fora do ar". */
const ORG_ALIVE = 12000;
class TourConn {
  private link: Link | null = null;
  private counter = 0;
  private session = Math.random().toString(36).slice(2, 10);
  private recent = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private ticks = 0;
  up = false;
  lastOrg = 0;
  constructor(public code: string) {
    void this.open();
  }
  private async open() {
    const link = await openChannel(`t-${this.code}`, {
      data: (env) => this.receive(env),
      up: () => {
        this.up = true;
        this.tick();
        hooks.changed();
      },
      down: () => {
        this.up = false;
        hooks.changed();
      },
    });
    if (this.closed) return link.close();
    this.link = link;
    this.timer = setInterval(() => this.tick(), 3000);
    this.tick();
  }
  close() {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    this.link?.close();
  }
  send(m: TourMsg, to?: string) {
    this.link?.send({ f: me(), s: this.session, i: ++this.counter, to, m });
  }
  private get e() {
    return entry(this.code);
  }
  /** Organizador: estado inteiro para todos (ou para um). */
  sendState(to?: string) {
    const e = this.e;
    if (!e?.t || e.role !== 'org') return;
    const t = e.t;
    void pack(t).then((z) => this.send({ t: 'tstate', z, rev: t.rev }, to));
  }
  /** Participante: apresenta-se (inscrição, deck) ou pede o estado. */
  hello() {
    const e = this.e;
    if (!e || e.role === 'org') return;
    this.send({ t: 'tjoin', v: PROTOCOL, name: myName(), deck: e.play && e.deck ? deckInfo(e.deck) : null, play: e.play }, e.t?.org);
  }
  /** Participante: reenvia os resultados ainda não confirmados. */
  flush() {
    const e = this.e;
    if (!e?.t || e.role === 'org') return;
    for (const r of e.pending) void pack(r).then((z) => this.send({ t: 'tres', z }, e.t!.org));
  }
  get orgAlive() {
    const e = this.e;
    return e?.role === 'org' ? this.up : Date.now() - this.lastOrg < ORG_ALIVE;
  }
  private tick() {
    if (this.closed || !this.link) return;
    const e = this.e;
    if (!e) return;
    this.ticks++;
    if (e.role === 'org') {
      // batimento com a versão: quem estiver atrás pede o estado
      if (e.t) this.send({ t: 'tping', rev: e.t.rev });
      return;
    }
    const t = e.t;
    const mine = t?.players.find((p) => p.id === me());
    // inscrição/troca de deck: só quando o organizador ainda aceita (senão ele recusa a cada batimento)
    const canChange = !t || t.status === 'lobby' || (t.status === 'running' && t.deckChange && !!mine);
    const differs = !mine || mine.name !== myName() || (!!e.deck && JSON.stringify(deckInfo(e.deck)) !== JSON.stringify(mine.deck));
    const wantJoin = e.play && canChange && differs;
    if (!e.t || !this.orgAlive) this.send({ t: 'tneed' }, e.t?.org);
    if (wantJoin || (!e.play && mine && e.t?.status === 'lobby')) this.hello();
    if (e.pending.length && this.ticks % 2 === 0) this.flush();
    if (this.ticks % 4 === 0) hooks.changed(); // "organizador fora do ar" aparece/some
  }
  private receive(env: Env) {
    if (!env || typeof env !== 'object' || env.f === me() || !env.m) return;
    if (env.to && env.to !== me()) return;
    const key = `${env.s}:${env.i}`;
    if (this.recent.has(key)) return;
    this.recent.add(key);
    if (this.recent.size > 600) this.recent = new Set([...this.recent].slice(-300));
    void this.handle(env.m as TourMsg, env.f);
  }
  private async handle(m: TourMsg, from: string) {
    const e = this.e;
    if (!e) return;
    if (e.role === 'org' && e.t) {
      const t = e.t;
      const org = e as TourEntry & { t: Tournament };
      if (m.t === 'tjoin') {
        if (m.v !== PROTOCOL) return this.send({ t: 'tdeny', msg: 'Versões diferentes do Riftbound Mesa: atualize a página para entrar no torneio.' }, from);
        if (m.play) {
          const r = joinPlayer(t, from, String(m.name ?? ''), cleanDeck(m.deck));
          if (r.msg) this.send({ t: 'tdeny', msg: r.msg }, from);
          if (r.changed) return commit(e);
        } else if (removePlayer(t, from)) return commit(e);
        this.sendState(from);
      } else if (m.t === 'tleave') {
        if (removePlayer(t, from)) commit(e);
      } else if (m.t === 'tneed') this.sendState(from);
      else if (m.t === 'tres') {
        try {
          const r = await unpack(String(m.z));
          const rep = cleanReport(r);
          if (rep) await applyReport(org, from, rep);
        } catch {
          /* relatório estragado: ele reenvia */
        }
        this.sendState(from);
      } else if (m.t === 'trq') {
        const s = rpStore()[Number(m.seed)];
        if (s) this.send({ t: 'trp', seed: Number(m.seed), z: s.z }, from);
      }
      return;
    }
    // participante / quem acompanha: só o organizador fala com autoridade
    if (e.t && from !== e.t.org) return;
    if (m.t === 'tstate') {
      if (e.t && m.rev <= e.t.rev) {
        this.lastOrg = Date.now();
        return;
      }
      try {
        const t = cleanTournament(await unpack(String(m.z)));
        if (!t || t.code !== this.code || t.org !== from || (e.t && t.rev <= e.t.rev)) return;
        e.t = t;
        this.lastOrg = Date.now();
        reconcile(e);
        save();
        hooks.changed();
      } catch {
        /* estado estragado: pede de novo no próximo batimento */
      }
    } else if (!e.t) return;
    else if (m.t === 'tping') {
      this.lastOrg = Date.now();
      if (typeof m.rev === 'number' && m.rev > e.t.rev) this.send({ t: 'tneed' }, from);
    } else if (m.t === 'trp') {
      const seed = Number(m.seed);
      if (typeof m.z !== 'string' || m.z.length > 900_000) return;
      putReplay(seed, m.z);
      if (wantReplay === seed) {
        wantReplay = null;
        void openTourReplay(this.code, seed);
      }
    } else if (m.t === 'tdeny') {
      e.note = cleanText(m.msg, 160);
      save();
      hooks.changed();
    }
  }
}
function cleanReport(x: any): TourReport | null {
  if (!x || typeof x !== 'object' || typeof x.mid !== 'string' || typeof x.seed !== 'number') return null;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(99, Math.floor(v))) : 0);
  return {
    mid: String(x.mid).slice(0, 12),
    seed: Math.floor(x.seed),
    a: String(x.a ?? ''),
    b: String(x.b ?? ''),
    w: x.w === 1 ? 1 : 0,
    pts: [n(x.pts?.[0]), n(x.pts?.[1])],
    turns: n(x.turns),
    decks: [cleanDeck(x.decks?.[0]), cleanDeck(x.decks?.[1])],
    z: typeof x.z === 'string' && x.z.length < 900_000 ? x.z : undefined,
    at: typeof x.at === 'number' ? x.at : Date.now(),
  };
}

const conns = new Map<string, TourConn>();
/** Torneio aberto na tela agora (fica conectado mesmo terminado, para ver o final). */
let focus: string | null = null;
/** Conecta aos torneios desta conta que ainda andam (e ao aberto na tela); desliga os outros. */
export function syncConns(focusCode?: string | null) {
  if (focusCode !== undefined) focus = focusCode;
  const live = new Set(
    entries()
      .filter((e) => e.code === focus || !e.t || e.t.status !== 'done' || e.pending.length || (e.role === 'org' && Date.now() - (e.t.finished ?? 0) < 6 * 3600_000))
      .map((e) => e.code),
  );
  for (const [code, c] of conns)
    if (!live.has(code)) {
      c.close();
      conns.delete(code);
    }
  for (const code of live) if (!conns.has(code)) conns.set(code, new TourConn(code));
}
/** Situação da conexão com o torneio, para a tela. */
export function connState(code: string): 'abrindo' | 'ok' | 'semorg' | 'semrede' {
  const c = conns.get(code);
  if (!c) return 'semrede';
  if (!c.up && !c.orgAlive) return c.lastOrg ? 'semrede' : 'abrindo';
  return c.orgAlive ? 'ok' : 'semorg';
}

/** Código da sala de um confronto: o mesmo nos dois aparelhos (o lado a abre, o b entra). */
export function matchRoomCode(code: string, mid: string): string {
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let h = 2166136261;
  for (const ch of `${code}:${mid}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += ALPHA[h % ALPHA.length];
    h = Math.imul(h ^ (h >>> 13), 2246822519) >>> 0;
  }
  return s;
}

let started = false;
export function initTour(h: Hooks) {
  hooks = h;
  if (started) return;
  started = true;
  syncConns();
  // a conta pode mudar (outro perfil) e torneios terminam: confere de tempos em tempos
  setInterval(() => syncConns(), 10000);
}
