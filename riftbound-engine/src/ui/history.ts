// Histórico de partidas da conta: cada partida terminada guarda data, modo, decks, resultado, turnos e o replay
// (cfg + respostas, compactado). Fica numa chave própria do localStorage por conta, com limite de tamanho: sem espaço,
// os replays mais antigos saem primeiro (o resumo fica), depois as partidas mais antigas.
import type { Engine, DeckList } from '../engine/engine';
import type { P } from '../engine/types';
import * as acc from './account';
import * as rating from './rating';

export type HistMode = 'ai' | 'human' | 'online';
export interface HistDeck {
  name: string;
  legend: string;
  champion: string;
  /** 'my:<id>' ou 'pre:<n>' quando deu para saber qual deck salvo era */
  deck?: string;
}
export interface HistEntry {
  id: string;
  at: number;
  mode: HistMode;
  /** de que lado a conta jogou (contra a IA: 0; online: o seu lugar; passa-e-joga: 0) */
  seat: P;
  names: [string, string];
  decks: [HistDeck, HistDeck];
  winner: P | null;
  points: [number, number];
  turns: number;
  reason?: string;
  /** número de respostas (lances) */
  moves: number;
  /** replay: 'd' = deflate-raw em base64; 'j' = JSON sem compactar */
  rz?: 'd' | 'j';
  replay?: string;
  /** o replay saiu por falta de espaço */
  dropped?: boolean;
  /** Novo: nível da IA (contra a IA) */
  ai?: string;
  /** Novo (online): id do amigo no ranking (rating.ts) e a mudança da sua pontuação nesta partida */
  opp?: string;
  elo?: { d: number; after: number };
}
interface Store {
  v: 1;
  list: HistEntry[];
}

export const MAX_GAMES = 50;
/** teto do histórico no localStorage (o aparelho costuma ter ~5 MB para a página inteira) */
const MAX_BYTES = 1_600_000;
const key = () => acc.HIST_PREFIX + acc.profile().id;

let cache: { key: string; store: Store } | null = null;
/** aviso da última gravação (ex.: falta de espaço), para a tela mostrar */
export let lastNote = '';

function load(): Store {
  const k = key();
  if (cache?.key === k) return cache.store;
  let store: Store = { v: 1, list: [] };
  try {
    const raw = localStorage.getItem(k);
    const o = raw ? JSON.parse(raw) : null;
    if (o && Array.isArray(o.list)) store = { v: 1, list: o.list };
  } catch {
    /* sem armazenamento ou dado estragado: começa vazio */
  }
  cache = { key: k, store };
  return store;
}

/** Grava; sem espaço, tira replays antigos (o resumo fica) e depois partidas antigas. Nunca lança erro. */
function persist(): boolean {
  const s = load();
  const k = key();
  const fits = () => {
    const txt = JSON.stringify(s);
    if (txt.length > MAX_BYTES) return false;
    try {
      localStorage.setItem(k, txt);
      return true;
    } catch {
      return false;
    }
  };
  if (fits()) return true;
  // 1) replays, do mais antigo para o mais novo (o mais novo fica por último)
  for (let i = s.list.length - 1; i > 0; i--) {
    if (!s.list[i].replay) continue;
    delete s.list[i].replay;
    delete s.list[i].rz;
    s.list[i].dropped = true;
    lastNote = 'Pouco espaço no aparelho: os replays mais antigos foram apagados (o resumo das partidas ficou).';
    if (fits()) return true;
  }
  // 2) partidas antigas inteiras
  while (s.list.length > 1) {
    s.list.pop();
    lastNote = 'Pouco espaço no aparelho: as partidas mais antigas saíram do histórico.';
    if (fits()) return true;
  }
  // 3) nem a última cabe com o replay
  if (s.list[0]?.replay) {
    delete s.list[0].replay;
    delete s.list[0].rz;
    s.list[0].dropped = true;
    if (fits()) return true;
  }
  lastNote = 'Sem espaço no aparelho para guardar o histórico.';
  return false;
}

export function list(): HistEntry[] {
  return load().list;
}
export function remove(id: string) {
  const s = load();
  s.list = s.list.filter((e) => e.id !== id);
  persist();
}
export function clear() {
  lastNote = '';
  load().list = [];
  persist();
}
/** Tamanho aproximado guardado (para a tela). */
export function bytes(): number {
  try {
    return (localStorage.getItem(key()) || '').length;
  } catch {
    return 0;
  }
}

// ───────────────────────────── compactação ─────────────────────────────
function toB64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b: string): Uint8Array {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
async function pipe(data: Uint8Array, stream: any): Promise<Uint8Array> {
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
async function pack(json: string): Promise<{ rz: 'd' | 'j'; replay: string }> {
  const CS = (globalThis as any).CompressionStream;
  if (CS) {
    try {
      return { rz: 'd', replay: toB64(await pipe(new TextEncoder().encode(json), new CS('deflate-raw'))) };
    } catch {
      /* sem compactação neste navegador */
    }
  }
  return { rz: 'j', replay: json };
}
async function unpack(e: HistEntry): Promise<string | null> {
  if (!e.replay) return null;
  if (e.rz !== 'd') return e.replay;
  const DS = (globalThis as any).DecompressionStream;
  if (!DS) return null;
  return new TextDecoder().decode(await pipe(fromB64(e.replay), new DS('deflate-raw')));
}
/** O replay da partida: { cfg, answers }, ou null se não houver (saiu por falta de espaço). */
export async function replayOf(id: string): Promise<{ cfg: any; answers: string[][] } | null> {
  const e = list().find((x) => x.id === id);
  if (!e) return null;
  try {
    const txt = await unpack(e);
    if (!txt) return null;
    const o = JSON.parse(txt);
    return o?.cfg && Array.isArray(o.answers) ? o : null;
  } catch {
    return null;
  }
}

// ───────────────────────────── gravar uma partida ─────────────────────────────
/** O que o jogador `p` fez na partida: cartas jogadas (com o turno dele) e cartas na mão no fim. */
export function summarize(eng: Engine, p: P): { played: [string, number][]; dead: string[] } {
  const own = [0, 0];
  const played: [string, number][] = [];
  for (const l of eng.log) {
    if (l.text.startsWith('── Turno') && l.player !== undefined) own[l.player]++;
    else if (l.meta?.kind === 'play' && l.player === p) played.push([l.meta.code, Math.max(1, own[p])]);
  }
  const dead = eng.pl[p].hand.map((id) => eng.objs[id]?.code).filter((c): c is string => !!c);
  return { played, dead };
}
const deckCards = (l: DeckList) => [l.champion, ...l.main.map(([c]) => c)].filter(Boolean);

const pending = new Set<string>();
/**
 * Guarda a partida terminada no histórico e nas estatísticas do deck da conta.
 * `seat`: o lado da conta; `choices`: o deck escolhido em cada lado ('my:<id>'/'pre:<n>'), quando se sabe.
 */
export function recordGame(
  g: { cfg: any; answers: unknown[]; engine: Engine; serialize(): string },
  info: { mode: HistMode; seat: P; prefer: [string | null, string | null] },
  done?: () => void,
) {
  const eng = g.engine;
  if (eng.winner === null) return;
  const id = `${g.cfg.seed}-${g.answers.length}`;
  if (pending.has(id) || list().some((e) => e.id === id)) return;
  const decks = g.cfg.decks as [DeckList, DeckList];
  const choice = [0, 1].map((p) => acc.matchDeckChoice(decks[p], [info.prefer[p]])) as [string | null, string | null];
  // estatísticas do deck (só o lado da conta)
  const me = info.seat;
  const sm = summarize(eng, me);
  const mineCards = new Set(deckCards(decks[me]));
  acc.recordMatch(id, choice[me], {
    won: eng.winner === me,
    countWL: info.mode !== 'human',
    turns: eng.turn,
    oppLegend: decks[1 - me]?.legend,
    played: sm.played.filter(([c]) => mineCards.has(c)),
    dead: sm.dead.filter((c) => mineCards.has(c)),
    cards: [...mineCards],
  });
  // ranking (só online, uma vez por partida) e o resumo do perfil
  const rk = rating.recordRanked(info.mode, g.cfg, eng.winner, me);
  const oppCard = Array.isArray(g.cfg.rank) ? rating.cleanCard(g.cfg.rank[1 - me]) : null;
  const aiLevel = info.mode === 'ai' && typeof g.cfg.aiLevel === 'string' ? (g.cfg.aiLevel as string) : undefined;
  rating.recordCareer(
    {
      seed: Number(g.cfg.seed),
      mode: info.mode,
      won: eng.winner === me,
      deckKey: choice[me],
      deckName: decks[me].name,
      legend: decks[me].legend,
      champion: decks[me].champion,
      opp: info.mode === 'ai' ? `ai:${aiLevel || '?'}` : info.mode === 'online' ? (oppCard ? `f:${oppCard.id}` : `n:${eng.pl[1 - me].name}`) : '',
      oppName: info.mode === 'online' && oppCard ? oppCard.name : eng.pl[1 - me].name,
    },
    list,
  );
  const e: HistEntry = {
    id,
    ...(aiLevel ? { ai: aiLevel } : {}),
    ...(info.mode === 'online' && oppCard ? { opp: oppCard.id } : {}),
    ...(rk ? { elo: { d: rk.d, after: rk.elo } } : {}),
    at: Date.now(),
    mode: info.mode,
    seat: me,
    names: [eng.pl[0].name, eng.pl[1].name],
    decks: [0, 1].map((p) => ({ name: decks[p].name, legend: decks[p].legend, champion: decks[p].champion, deck: choice[p] ?? undefined })) as [HistDeck, HistDeck],
    winner: eng.winner,
    points: [eng.pl[0].points, eng.pl[1].points],
    turns: eng.turn,
    reason: eng.winReason || undefined,
    moves: g.answers.length,
  };
  pending.add(id);
  const json = g.serialize();
  const k = key();
  void pack(json)
    .then((r) => Object.assign(e, r), () => Object.assign(e, { rz: 'j', replay: json }))
    .then(() => {
      pending.delete(id);
      if (key() !== k) return; // trocou de conta no meio
      const s = load();
      if (s.list.some((x) => x.id === id)) return;
      s.list.unshift(e);
      if (s.list.length > MAX_GAMES) s.list.length = MAX_GAMES;
      persist();
      done?.();
    });
}
