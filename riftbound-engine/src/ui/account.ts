// Conta local do jogador: perfis neste navegador, decks salvos, código de deck (formato Piltover Archive)
// e estatísticas simples. Tudo fica no localStorage do aparelho.
import { getCodeFromDeck, getDeckFromCode } from '@piltoverarchive/riftbound-deck-codes';
import cards from '../data/cards.json';
import { cardData, isChampionCard, isSignature, kindOf } from '../engine/db';
import { checkDeck, needsExtraLegends } from '../engine/deckcheck';
import type { DeckList } from '../engine/engine';
import { DECKS } from '../decks/origins';

export interface SavedDeck {
  id: string;
  name: string;
  legend: string | null;
  champion: string | null; // campeão escolhido (uma das cópias de `main`)
  main: Record<string, number>; // inclui as cópias do campeão escolhido
  side: Record<string, number>;
  runes: Record<string, number>;
  battlefields: string[];
  /** Novo (RAD-167 Neeko, Blending In): as 3 lendas escolhidas além da inicial. */
  extraLegends?: string[];
  updated: number;
  wins?: number;
  losses?: number;
  /** Novo (opcional): carta da capa e o recorte (centro x/y de 0 a 1 na arte, zoom >= 1). */
  cover?: DeckCover;
  /** Novo (opcional): estatísticas das partidas terminadas com este deck. */
  stats?: DeckStats;
  /** Novo (opcional): id do deck de onde esta cópia saiu (para comparar com a original). */
  origin?: string;
  /** Novo (opcional): música da partida (id do tabuleiro em src/ui/music.ts; vazio = sorteada; 'none' = sem música). */
  music?: string;
}
export interface DeckCover {
  code: string;
  x: number;
  y: number;
  z: number;
}
export interface DeckStats {
  /** partidas e vitórias (começam com o placar antigo V/D, se havia) */
  g: number;
  w: number;
  /** partidas com o número de turnos registrado e a soma dos turnos */
  tg: number;
  turns: number;
  /** por lenda do oponente */
  vs: Record<string, { g: number; w: number }>;
  /** por carta: partidas com ela no deck, vezes jogada, soma do turno (do jogador) em que foi jogada, cópias na mão no fim */
  cards: Record<string, { g: number; p: number; t: number; d: number }>;
}
export interface Profile {
  id: string;
  name: string;
  decks: SavedDeck[];
  created: number;
  recorded?: string[]; // partidas já contadas nas estatísticas
  /** Novo: "Pagar: manual" lembrado (ao começar a partida a mesa liga o modo pela ação do motor). Ausente = automático. */
  manualPay?: boolean;
  /** Novo: progresso do tutorial "Aprender a jogar" (ver tutorial.ts). Ausente = nunca abriu nem dispensou. */
  tutorial?: TutorialProgress;
}
/** Tutorial: a partida guiada é refeita pelas respostas (cfg fixo); `step` = passo em que parou. */
export interface TutorialProgress {
  step: number;
  answers: string[][];
  /** terminou pelo menos uma vez */
  done?: boolean;
  /** dispensou a sugestão da primeira visita sem abrir */
  dismissed?: boolean;
  at: number;
}
interface Store {
  active: string;
  profiles: Record<string, Profile>;
}

const KEY = 'riftbound-mesa-conta-v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

let store: Store | null = null;
function load(): Store {
  if (store) return store;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) store = JSON.parse(raw);
  } catch {
    store = null;
  }
  if (!store || !store.profiles || !store.profiles[store.active]) {
    const p: Profile = { id: uid(), name: 'Você', decks: [], created: Date.now() };
    store = { active: p.id, profiles: { [p.id]: p } };
    persist();
  }
  return store;
}
export function persist() {
  try {
    if (store) localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* sem armazenamento: a conta vale só nesta sessão */
  }
}

export function profile(): Profile {
  const s = load();
  return s.profiles[s.active];
}
export function profiles(): Profile[] {
  return Object.values(load().profiles).sort((a, b) => a.created - b.created);
}
export function switchProfile(id: string) {
  const s = load();
  if (s.profiles[id]) {
    s.active = id;
    persist();
  }
}
export function createProfile(name: string): Profile {
  const s = load();
  const p: Profile = { id: uid(), name: name.trim().slice(0, 20) || 'Jogador', decks: [], created: Date.now() };
  s.profiles[p.id] = p;
  s.active = p.id;
  persist();
  return p;
}
export function renameProfile(name: string) {
  profile().name = name.trim().slice(0, 20) || 'Você';
  persist();
}
/** Histórico de partidas de cada conta: chave própria no localStorage (ver history.ts). */
export const HIST_PREFIX = 'riftbound-mesa-historico-v1:';
export function deleteProfile(id: string) {
  const s = load();
  if (Object.keys(s.profiles).length <= 1) return;
  delete s.profiles[id];
  try {
    localStorage.removeItem(HIST_PREFIX + id);
  } catch {
    /* sem armazenamento */
  }
  if (s.active === id) s.active = Object.keys(s.profiles)[0];
  persist();
}
/** Backup da conta inteira (para levar para outro aparelho). */
export function exportProfile(): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(profile()))));
}
export function importProfile(text: string): Profile {
  const p = JSON.parse(decodeURIComponent(escape(atob(text.trim())))) as Profile;
  if (!p || !Array.isArray(p.decks)) throw new Error('Backup inválido.');
  const s = load();
  p.id = uid();
  p.created = Date.now();
  s.profiles[p.id] = p;
  s.active = p.id;
  persist();
  return p;
}

/** "Pagar: manual" lembrado nesta conta. */
export function manualPayPref(): boolean {
  return !!profile().manualPay;
}
export function setManualPayPref(on: boolean) {
  const p = profile();
  if (!!p.manualPay === on) return;
  if (on) p.manualPay = true;
  else delete p.manualPay;
  persist();
}

/** Progresso do tutorial nesta conta (null: nunca abriu nem dispensou a sugestão). */
export function tutorialProgress(): TutorialProgress | null {
  return profile().tutorial ?? null;
}
export function setTutorialProgress(t: TutorialProgress | null) {
  const p = profile();
  if (t) p.tutorial = t;
  else delete p.tutorial;
  persist();
}

// ───────────────────────────── decks ─────────────────────────────
/** O deck salvo por trás de uma escolha da tela inicial ("pre:N" é starter: não tem). */
export function savedDeckOf(choice: string | number): SavedDeck | undefined {
  return typeof choice === 'string' && !choice.startsWith('pre:') ? getDeck(choice.slice(3)) : undefined;
}
export function getDeck(id: string): SavedDeck | undefined {
  return profile().decks.find((d) => d.id === id);
}
export function newDeck(name = 'Novo deck'): SavedDeck {
  const d: SavedDeck = { id: uid(), name, legend: null, champion: null, main: {}, side: {}, runes: {}, battlefields: [], updated: Date.now() };
  profile().decks.unshift(d);
  persist();
  return d;
}
export function saveDeck(d: SavedDeck) {
  d.updated = Date.now();
  const list = profile().decks;
  const i = list.findIndex((x) => x.id === d.id);
  if (i >= 0) list[i] = d;
  else list.unshift(d);
  persist();
}
export function deleteDeck(id: string) {
  const p = profile();
  p.decks = p.decks.filter((d) => d.id !== id);
  persist();
}
export function duplicateDeck(d: SavedDeck): SavedDeck {
  const c: SavedDeck = JSON.parse(JSON.stringify(d));
  c.id = uid();
  c.name = `${d.name} (cópia)`;
  c.wins = 0;
  c.losses = 0;
  delete c.stats;
  c.origin = d.id;
  saveDeck(c);
  return c;
}
export function fromDeckList(l: DeckList, name = l.name): SavedDeck {
  const main: Record<string, number> = {};
  for (const [c, n] of l.main) main[c] = (main[c] || 0) + n;
  main[l.champion] = (main[l.champion] || 0) + 1;
  return {
    id: uid(),
    name,
    legend: l.legend,
    champion: l.champion,
    main,
    side: {},
    runes: Object.fromEntries(l.runes),
    battlefields: [...l.battlefields],
    extraLegends: l.extraLegends?.length ? [...l.extraLegends] : undefined,
    updated: Date.now(),
  };
}
export function toDeckList(d: SavedDeck): DeckList {
  const main = Object.entries(d.main)
    .map(([c, n]) => [c, c === d.champion ? n - 1 : n] as [string, number])
    .filter(([, n]) => n > 0);
  return {
    name: d.name,
    legend: d.legend ?? '',
    champion: d.champion ?? '',
    main,
    runes: Object.entries(d.runes).filter(([, n]) => n > 0),
    battlefields: [...d.battlefields],
    // novo (Neeko): só com uma carta que pede lendas extras no deck (sobras de um Neeko tirado não atrapalham)
    extraLegends: needsExtraLegends(main.map(([c]) => c).concat(d.champion ? [d.champion] : [])) && d.extraLegends?.length ? [...d.extraLegends] : undefined,
  };
}

export const count = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export interface DeckCheck {
  errors: string[];
  banned: string[];
  ok: boolean;
}
/** Regras de construção (103) + sideboard do construído (601.1.c). */
export function validate(d: SavedDeck): DeckCheck {
  const errors: string[] = [];
  if (!d.legend) errors.push('Escolha uma lenda.');
  if (!d.champion) errors.push('Escolha o campeão (uma unidade campeã com a tag da lenda).');
  else if (!d.main[d.champion]) errors.push('O campeão escolhido precisa estar no deck principal.');
  if (d.legend && d.champion && d.main[d.champion]) {
    const r = checkDeck(toDeckList(d));
    errors.push(...r.errors);
  } else {
    if (count(d.main) < 40) errors.push(`O deck principal tem ${count(d.main)} cartas (mínimo 40).`);
    if (count(d.runes) !== 12) errors.push(`${count(d.runes)} runas (precisa de 12).`);
    if (d.battlefields.length !== 3) errors.push(`${d.battlefields.length} campos (precisa de 3).`);
  }
  const names = d.battlefields.map((c) => cardData(c).name);
  if (new Set(names).size !== names.length) errors.push('Os 3 campos precisam ter nomes diferentes.');
  if (d.legend) {
    const ident = new Set(cardData(d.legend).domains);
    for (const r of Object.keys(d.runes)) if (d.runes[r] && cardData(r).domains.some((x) => !ident.has(x))) errors.push(`${cardData(r).name} está fora da identidade de domínio.`);
  }
  const side = count(d.side);
  if (side > 10) errors.push(`O side tem ${side} cartas (máximo 10).`);
  // cópias somando principal + side
  const byName: Record<string, number> = {};
  for (const r of [d.main, d.side]) for (const [c, n] of Object.entries(r)) byName[cardData(c).name] = (byName[cardData(c).name] || 0) + n;
  for (const [nm, n] of Object.entries(byName)) if (n > 3) errors.push(`${nm}: ${n} cópias somando principal e side (máximo 3).`);
  const uniq = [...new Set(errors)];
  const banned = d.legend && d.champion ? checkDeck(toDeckList(d)).banned : [];
  return { errors: uniq, banned, ok: uniq.length === 0 };
}

// ───────────────────────────── código de deck ─────────────────────────────
export function deckCode(d: SavedDeck): string {
  const main: { cardCode: string; count: number }[] = [];
  if (d.legend) main.push({ cardCode: d.legend, count: 1 });
  for (const [c, n] of Object.entries(d.main)) if (n > 0) main.push({ cardCode: c, count: n });
  for (const [c, n] of Object.entries(d.runes)) if (n > 0) main.push({ cardCode: c, count: n });
  for (const c of d.battlefields) main.push({ cardCode: c, count: 1 });
  const side = Object.entries(d.side)
    .filter(([, n]) => n > 0)
    .map(([c, n]) => ({ cardCode: c, count: n }));
  const code = getCodeFromDeck(main, side, d.champion ?? undefined);
  // novo (Neeko): o formato Piltover Archive não guarda qual lenda é a inicial (a ordem das cartas não se mantém), então
  // as lendas extras vão à parte, depois de "~L:" — o que vem antes continua sendo um código Piltover Archive normal
  const ex = toDeckList(d).extraLegends;
  return ex?.length ? `${code}${LEGENDS_SEP}${ex.join(',')}` : code;
}
/** Separador das lendas extras (Neeko) no código de deck: fora do alfabeto base32 do formato Piltover Archive. */
export const LEGENDS_SEP = '~L:';

const DB = cards as Record<string, any>;
/** Lê um código de deck (Piltover Archive, TCG Arena e afins). Cartas desconhecidas entram em `skipped`. */
export function deckFromCode(code: string, name = 'Deck importado'): { deck: SavedDeck; skipped: string[] } {
  const [paCode, exPart] = code.trim().split(LEGENDS_SEP);
  const dec = getDeckFromCode(paCode.trim());
  const skipped: string[] = [];
  const norm = (c: string) => {
    if (DB[c]) return c;
    const base = c.replace(/[a-z*]$/, '');
    return DB[base] ? base : null;
  };
  const d: SavedDeck = { id: uid(), name, legend: null, champion: null, main: {}, side: {}, runes: {}, battlefields: [], updated: Date.now() };
  for (const { cardCode, count: n } of dec.mainDeck) {
    const c = norm(cardCode);
    if (!c) {
      skipped.push(cardCode);
      continue;
    }
    const k = kindOf(c);
    if (k === 'legend') d.legend = d.legend ?? c;
    else if (k === 'battlefield') d.battlefields.push(c);
    else if (k === 'rune') d.runes[c] = (d.runes[c] || 0) + n;
    else d.main[c] = (d.main[c] || 0) + n;
  }
  for (const { cardCode, count: n } of dec.sideboard) {
    const c = norm(cardCode);
    if (c) d.side[c] = (d.side[c] || 0) + n;
    else skipped.push(cardCode);
  }
  const ch = dec.chosenChampion ? norm(dec.chosenChampion) : null;
  if (ch && d.main[ch]) d.champion = ch;
  else if (d.legend) {
    const tags = cardData(d.legend).tags;
    d.champion = Object.keys(d.main).find((c) => isChampionCard(c) && !isSignature(c) && cardData(c).tags.some((t) => tags.includes(t))) ?? null;
  }
  // novo (Neeko): lendas extras guardadas à parte no código (ver deckCode)
  if (exPart) {
    const ex = exPart.split(',').map((c) => c.trim()).filter(Boolean);
    const ok = ex.map(norm).filter((c): c is string => !!c && kindOf(c) === 'legend');
    for (const c of ex) if (!norm(c)) skipped.push(c);
    if (ok.length) d.extraLegends = ok;
  }
  if (d.legend) d.name = name === 'Deck importado' ? `${cardData(d.legend).name.split(',')[0]} (importado)` : name;
  return { deck: d, skipped };
}

// ───────────────────────────── escolha de deck para jogar ─────────────────────────────
export interface DeckChoice {
  id: string; // 'pre:0' | 'my:<id>'
  name: string;
  deck: DeckList | null;
  ok: boolean;
  group: 'Starters' | 'Meus decks';
}
export function deckChoices(): DeckChoice[] {
  const pre = DECKS.map((d, i) => ({ id: `pre:${i}`, name: d.name, deck: d, ok: true, group: 'Starters' as const }));
  const mine = profile().decks.map((d) => {
    const v = validate(d);
    return { id: `my:${d.id}`, name: d.name, deck: v.ok ? toDeckList(d) : null, ok: v.ok, group: 'Meus decks' as const };
  });
  return [...pre, ...mine];
}
export function deckById(id: string | number): DeckList {
  if (typeof id === 'number') return DECKS[id] ?? DECKS[0];
  if (id.startsWith('pre:')) return DECKS[Number(id.slice(4))] ?? DECKS[0];
  const d = getDeck(id.slice(3));
  if (d && validate(d).ok) return toDeckList(d);
  return DECKS[0];
}

/** A partida já foi contada nas estatísticas? */
export function alreadyRecorded(key: string): boolean {
  return !!profile().recorded?.includes(key);
}
/** Conta a partida nas estatísticas do deck (uma vez por partida). */
export function recordResult(key: string, deckId: string, won: boolean) {
  recordMatch(key, deckId, { won, countWL: true });
}
export interface MatchFacts {
  won: boolean;
  /** conta no placar V/D antigo (contra a IA e online, como antes) */
  countWL: boolean;
  turns?: number;
  oppLegend?: string;
  /** [carta, turno do jogador] de cada carta do deck jogada */
  played?: [string, number][];
  /** cartas na mão no fim da partida */
  dead?: string[];
  /** cartas do deck principal (com o campeão) */
  cards?: string[];
}
/** Conta uma partida terminada no deck `deckId` ('my:<id>'). Devolve false se já tinha sido contada. */
export function recordMatch(key: string, deckId: string | null, f: MatchFacts): boolean {
  const p = profile();
  p.recorded = p.recorded || [];
  if (p.recorded.includes(key)) return false;
  p.recorded.push(key);
  if (p.recorded.length > 80) p.recorded.splice(0, p.recorded.length - 80);
  const d = deckId?.startsWith('my:') ? getDeck(deckId.slice(3)) : null;
  if (d) {
    if (f.countWL) {
      if (f.won) d.wins = (d.wins || 0) + 1;
      else d.losses = (d.losses || 0) + 1;
    }
    const st = (d.stats = d.stats || { g: (d.wins || 0) + (d.losses || 0) - (f.countWL ? 1 : 0), w: (d.wins || 0) - (f.countWL && f.won ? 1 : 0), tg: 0, turns: 0, vs: {}, cards: {} });
    st.g++;
    if (f.won) st.w++;
    if (f.turns) {
      st.tg++;
      st.turns += f.turns;
    }
    if (f.oppLegend) {
      const v = (st.vs[f.oppLegend] = st.vs[f.oppLegend] || { g: 0, w: 0 });
      v.g++;
      if (f.won) v.w++;
    }
    const cs = (code: string) => (st.cards[code] = st.cards[code] || { g: 0, p: 0, t: 0, d: 0 });
    for (const c of new Set(f.cards || [])) cs(c).g++;
    for (const [c, t] of f.played || []) {
      const x = cs(c);
      x.p++;
      x.t += t;
    }
    for (const c of f.dead || []) cs(c).d++;
  }
  persist();
  return true;
}
/** Placar do deck: das estatísticas novas, ou do V/D antigo. */
export function deckRecord(d: SavedDeck): { g: number; w: number; l: number; avgTurns: number | null } {
  if (d.stats) return { g: d.stats.g, w: d.stats.w, l: d.stats.g - d.stats.w, avgTurns: d.stats.tg ? d.stats.turns / d.stats.tg : null };
  const w = d.wins || 0;
  const l = d.losses || 0;
  return { g: w + l, w, l, avgTurns: null };
}

/** Impressão digital de uma lista (para achar qual deck salvo foi usado numa partida). */
export function deckPrint(l: DeckList): string {
  const m = [...l.main].map(([c, n]) => `${c}x${n}`).sort().join(',');
  const r = [...l.runes].map(([c, n]) => `${c}x${n}`).sort().join(',');
  return [l.legend, l.champion, m, r, [...l.battlefields].sort().join(','), (l.extraLegends || []).join(',')].join('|');
}
/** Qual escolha de deck ('my:<id>' ou 'pre:<n>') bate com esta lista? Tenta primeiro `prefer`. */
export function matchDeckChoice(l: DeckList, prefer: (string | null | undefined)[] = []): string | null {
  const fp = deckPrint(l);
  for (const id of prefer) {
    if (!id) continue;
    if (id.startsWith('my:')) {
      const d = getDeck(id.slice(3));
      if (d && deckPrint(toDeckList(d)) === fp) return id;
    } else if (id.startsWith('pre:')) {
      const d = DECKS[Number(id.slice(4))];
      if (d && deckPrint(d) === fp) return id;
    }
  }
  for (const d of profile().decks) if (d.legend && d.champion && deckPrint(toDeckList(d)) === fp) return `my:${d.id}`;
  const i = DECKS.findIndex((d) => deckPrint(d) === fp);
  return i >= 0 ? `pre:${i}` : null;
}

// ───────────────────────────── lista de deck em texto ─────────────────────────────
// Formato das listas do Piltover Archive / TCG Arena / Discord:
//   Legend:\n1 Riven, The Exile\n\nChampion:\n1 Riven, Broken Blade\n\nMainDeck:\n2 Tideturner\n...
//   Battlefields: / Rune Pool: / Sideboard:
// O campeão escolhido conta como uma das cópias do deck principal (103.2.b), como em `main`.
const SET_ORDER = ['OGN', 'OGS', 'SFD', 'UNL', 'VEN', 'RAD'];
const normName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
let byName: Map<string, string> | null = null;
function nameIndex(): Map<string, string> {
  if (byName) return byName;
  byName = new Map();
  const codes = Object.keys(DB)
    .filter((c) => /^[A-Z]{3}-\d{3}$/.test(c) && SET_ORDER.includes(c.slice(0, 3)))
    .sort((a, b) => SET_ORDER.indexOf(a.slice(0, 3)) - SET_ORDER.indexOf(b.slice(0, 3)) || a.localeCompare(b));
  for (const c of codes) {
    const n = normName(DB[c].name);
    if (!byName.has(n)) byName.set(n, c); // reimpressão: fica a primeira impressão (mesmo texto)
    // lenda também pelo título sem o campeão ("The Exile") e campeão/carta pelo nome com " - " no lugar da vírgula
    const comma = n.indexOf(', ');
    if (comma > 0) {
      const alt = n.replace(', ', ' - ');
      if (!byName.has(alt)) byName.set(alt, c);
      if (kindOf(c) === 'legend' && !byName.has(n.slice(comma + 2))) byName.set(n.slice(comma + 2), c);
    }
  }
  return byName;
}
/** Código da carta pelo nome (ou o próprio código, se vier "OGN-001"). */
export function codeByName(name: string): string | null {
  const t = name.trim();
  const m = /^([A-Z]{3})-(\d{3})/.exec(t.toUpperCase());
  if (m && DB[`${m[1]}-${m[2]}`]) return `${m[1]}-${m[2]}`;
  return nameIndex().get(normName(t)) ?? null;
}
/** Parece uma lista de deck em texto (e não um código)? */
export function looksLikeDeckText(s: string): boolean {
  return /^\s*\d+\s*x?\s+\S/m.test(s) && /\n/.test(s.trim());
}
type Section = 'legend' | 'champion' | 'main' | 'bf' | 'runes' | 'side' | null;
function sectionOf(line: string): Section | undefined {
  const h = normName(line.replace(/:\s*$/, '')).replace(/[^a-z ]/g, '').replace(/\s+/g, '');
  const map: Record<string, Section> = {
    legend: 'legend', legends: 'legend', champion: 'champion', chosenchampion: 'champion', maindeck: 'main', main: 'main',
    deck: 'main', battlefields: 'bf', battlefield: 'bf', runepool: 'runes', runes: 'runes', runedeck: 'runes',
    sideboard: 'side', side: 'side', extralegends: 'legend',
  };
  return /:\s*$/.test(line.trim()) || map[h] !== undefined ? map[h] : undefined;
}
/** Lê uma lista de deck em texto. Nomes desconhecidos entram em `skipped`. */
export function deckFromText(text: string, name = 'Deck importado'): { deck: SavedDeck; skipped: string[] } {
  const d: SavedDeck = { id: uid(), name, legend: null, champion: null, main: {}, side: {}, runes: {}, battlefields: [], updated: Date.now() };
  const skipped: string[] = [];
  const legends: string[] = [];
  let sec: Section = 'main';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const s = sectionOf(line);
    if (s !== undefined) {
      sec = s;
      continue;
    }
    const m = /^(\d+)\s*x?\s+(.+?)\s*$/i.exec(line);
    const n = m ? Number(m[1]) : 1;
    const nm = (m ? m[2] : line).replace(/\s*\([A-Z]{3}[- ]?\d+[a-z*]?\)\s*$/i, ''); // "(OGN-001)" no fim
    const c = codeByName(nm);
    if (!c) {
      skipped.push(nm);
      continue;
    }
    const k = kindOf(c);
    if (k === 'legend') legends.push(c);
    else if (k === 'battlefield') d.battlefields.push(c);
    else if (k === 'rune') d.runes[c] = (d.runes[c] || 0) + n;
    else if (sec === 'side') d.side[c] = (d.side[c] || 0) + n;
    else if (sec === 'champion') {
      d.champion = c;
      d.main[c] = (d.main[c] || 0) + n;
    } else d.main[c] = (d.main[c] || 0) + n;
  }
  d.legend = legends[0] ?? null;
  if (legends.length > 1) d.extraLegends = legends.slice(1); // Neeko: lendas extras depois da inicial
  if (!d.champion && d.legend) {
    const tags = cardData(d.legend).tags;
    d.champion = Object.keys(d.main).find((c) => isChampionCard(c) && !isSignature(c) && cardData(c).tags.some((t) => tags.includes(t))) ?? null;
  }
  if (d.legend) d.name = name === 'Deck importado' ? `${cardData(d.legend).name.split(',')[0]} (importado)` : name;
  return { deck: d, skipped };
}
/** Escreve o deck no mesmo formato de lista em texto. */
export function deckText(d: SavedDeck): string {
  const nm = (c: string) => cardData(c).name;
  const out: string[] = [];
  if (d.legend) out.push('Legend:', `1 ${nm(d.legend)}`, '');
  if (d.extraLegends?.length) out.push('Extra Legends:', ...d.extraLegends.map((c) => `1 ${nm(c)}`), '');
  if (d.champion) out.push('Champion:', `1 ${nm(d.champion)}`, '');
  const main = { ...d.main };
  if (d.champion && main[d.champion]) main[d.champion]--;
  const mainLines = Object.entries(main).filter(([, n]) => n > 0).map(([c, n]) => `${n} ${nm(c)}`);
  if (mainLines.length) out.push('MainDeck:', ...mainLines, '');
  if (d.battlefields.length) out.push('Battlefields:', ...d.battlefields.map((c) => `1 ${nm(c)}`), '');
  const runes = Object.entries(d.runes).filter(([, n]) => n > 0);
  if (runes.length) out.push('Rune Pool:', ...runes.map(([c, n]) => `${n} ${nm(c)}`), '');
  const side = Object.entries(d.side).filter(([, n]) => n > 0);
  if (side.length) out.push('Sideboard:', ...side.map(([c, n]) => `${n} ${nm(c)}`), '');
  return out.join('\n').trim();
}
/** Importa código OU lista em texto. */
export function deckFromAny(s: string): { deck: SavedDeck; skipped: string[] } {
  return looksLikeDeckText(s) ? deckFromText(s) : deckFromCode(s);
}
