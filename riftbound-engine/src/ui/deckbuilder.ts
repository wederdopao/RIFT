// Montagem de decks: biblioteca de cartas do Origins com filtros, deck principal, side, runas, campos,
// validação, código de deck e lista de decks salvos da conta.
import cards from '../data/cards.json';
import { cardData, hasCard, isChampionCard, isSignature, kindOf } from '../engine/db';
import { isImplemented } from '../engine/script';
import type { Domain } from '../engine/types';
import { BANNED_STANDARD } from '../data/banlist';
import { DECKS } from '../decks/origins';
import { artUrl } from './art';
import { DOMAIN_COLOR, DOMAIN_PT, esc, rulesHtml } from './text';
import * as acc from './account';
import * as hist from './history';
import { copyText } from './copy';
import { needsExtraLegends } from '../engine/deckcheck';
import { loadMusic, musicBoards, previewTrack } from './music';
import { pageZoom } from './zoom';

type Cat = 'unit' | 'champion' | 'spell' | 'signature' | 'gear' | 'legend' | 'battlefield' | 'rune';
const CAT_PT: Record<Cat, string> = {
  legend: 'Lendas', champion: 'Campeões', unit: 'Unidades', spell: 'Spells', signature: 'Signature', gear: 'Gear', battlefield: 'Campos', rune: 'Runas',
};
const DOMAINS: Domain[] = ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'];

interface PoolCard {
  code: string;
  name: string;
  cat: Cat;
  domains: Domain[];
  energy: number;
  power: number;
  might: number;
  rarity: string;
  set: string;
  num: number;
  text: string;
  tags: string[];
  /** palavras-chave citadas no texto (minúsculas) */
  kw: string[];
}
/** Palavras-chave do filtro (tiradas do texto das cartas, entre colchetes). */
export const KEYWORDS = [
  'Accelerate', 'Action', 'Ambush', 'Assault', 'Backline', 'Buff', 'Burn', 'Deathknell', 'Deflect', 'Deploy', 'Disarm', 'Empower',
  'Equip', 'Flow', 'Ganking', 'Hidden', 'Hunt', 'Legion', 'Level', 'Mighty', 'Predict', 'Quick-Draw', 'Reaction', 'Repeat', 'Shield',
  'Show Off', 'Stun', 'Tank', 'Temporary', 'Vision', 'Weaponmaster',
];
const KW_ALIAS: Record<string, string> = { empowered: 'empower' };
function keywordsOf(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\[([A-Za-z][A-Za-z\- ]*?)(?: \d+)?\]/g)) {
    const k = m[1].toLowerCase();
    out.add(KW_ALIAS[k] ?? k);
  }
  return [...out];
}
function catOf(code: string): Cat {
  const k = kindOf(code);
  if (k === 'legend') return 'legend';
  if (k === 'battlefield') return 'battlefield';
  if (k === 'rune') return 'rune';
  if (isSignature(code)) return 'signature';
  if (isChampionCard(code)) return 'champion';
  if (k === 'unit') return 'unit';
  if (k === 'gear') return 'gear';
  return 'spell';
}
let POOL: PoolCard[] | null = null;
export function pool(): PoolCard[] {
  if (POOL) return POOL;
  POOL = Object.values(cards as Record<string, any>)
    .filter((c) => /^(OGN|OGS|SFD|UNL|VEN|RAD)-\d{3}$/.test(c.code) && !/token/i.test(c.type))
    .map((c) => ({
      code: c.code,
      name: c.name,
      cat: catOf(c.code),
      domains: c.domains,
      energy: c.energy,
      power: c.power,
      might: c.might,
      rarity: c.rarity,
      set: c.code.slice(0, 3),
      num: Number(c.code.slice(4)),
      text: c.text,
      tags: c.tags,
      kw: keywordsOf(`${c.text} ${c.effectText || ''}`),
    }));
  return POOL;
}
export function poolCodes(): string[] {
  return pool().map((c) => c.code);
}

// ───────────────────────────── estado ─────────────────────────────
export const db = {
  view: 'list' as 'list' | 'edit' | 'history',
  deckId: null as string | null,
  q: '',
  domains: [] as Domain[],
  cats: [] as Cat[],
  costs: [] as number[],
  fit: true,
  sort: 'num' as 'num' | 'cost' | 'name' | 'might',
  set: 'all',
  rarity: 'all',
  hover: null as string | null,
  zoom: null as string | null,
  note: '',
  confirmDelete: null as string | null,
  importOpen: false,
  importErr: '',
  tab: 'cards' as 'cards' | 'deck',
  backupOpen: false,
  backupText: '',
  sample: [] as string[],
  more: false,
  /** novo: filtro por palavra-chave */
  kws: [] as string[],
  /** cartas já desenhadas na grade (o resto entra ao rolar) */
  shown: 0,
  resetScroll: false,
  /** janela aberta no editor */
  modal: null as null | 'cover' | 'compare',
  compareWith: '' as string,
  runeSug: null as null | { runes: Record<string, number>; why: string },
  statsOpen: false,
  /** histórico: só as partidas deste deck ('my:<id>'), ou todas */
  histDeck: '' as string,
  histConfirm: false,
};

export interface DbHooks {
  render: () => void;
  openReplay: (cfg: any, answers: string[][], view: 0 | 1) => void;
  play: (deckChoiceId: string) => void;
  back: () => void;
  touch: () => boolean;
}
let hooks: DbHooks;
export function setHooks(h: DbHooks) {
  hooks = h;
}

const cur = () => (db.deckId ? acc.getDeck(db.deckId) ?? null : null);
const ident = (d: acc.SavedDeck | null) => (d?.legend ? new Set(cardData(d.legend).domains) : null);
const legendTags = (d: acc.SavedDeck | null) => (d?.legend ? cardData(d.legend).tags : []);
const nameCount = (d: acc.SavedDeck, code: string) => {
  const nm = cardData(code).name;
  let n = 0;
  for (const r of [d.main, d.side]) for (const [c, k] of Object.entries(r)) if (cardData(c).name === nm) n += k;
  return n;
};
const sigCount = (d: acc.SavedDeck) => Object.entries(d.main).reduce((s, [c, n]) => s + (isSignature(c) ? n : 0), 0);
const isUnique = (code: string) => /\[Unique\]/i.test(cardData(code).text);

/** Campeões (não Signature) com a tag desta lenda em toda a coleção do jogo. */
const champMemo = new Map<string, string[]>();
function championsFor(legend: string): string[] {
  let r = champMemo.get(legend);
  if (!r) {
    const tags = cardData(legend).tags;
    r = pool()
      .filter((c) => c.cat === 'champion' && c.tags.some((t) => tags.includes(t)))
      .map((c) => c.code);
    champMemo.set(legend, r);
  }
  return r;
}

function fits(d: acc.SavedDeck | null, c: PoolCard): boolean {
  const id = ident(d);
  if (!id) return true;
  if (c.cat === 'legend' || c.cat === 'battlefield') return true;
  if (!c.domains.every((x) => id.has(x))) return false;
  if (c.cat === 'signature') return c.tags.some((t) => legendTags(d).includes(t));
  return true;
}

// ───────────────────────────── ações no deck ─────────────────────────────
function say(msg: string) {
  db.note = msg;
}
function addMain(d: acc.SavedDeck, code: string, side = false): boolean {
  const c = cardData(code);
  const max = isUnique(code) ? 1 : 3;
  if (nameCount(d, code) >= max) return say(`${c.name}: já tem ${max} ${max === 1 ? 'cópia (Unique)' : 'cópias'} somando principal e side.`), false;
  if (side) {
    if (acc.count(d.side) >= 10) return say('O side já tem 10 cartas.'), false;
    d.side[code] = (d.side[code] || 0) + 1;
    return true;
  }
  if (isSignature(code) && sigCount(d) >= 3) return say('O deck já tem 3 cartas Signature.'), false;
  d.main[code] = (d.main[code] || 0) + 1;
  // campeão: o primeiro que combinar com a lenda vira o escolhido
  if (isChampionCard(code) && !isSignature(code) && !d.champion && legendTags(d).some((t) => c.tags.includes(t))) d.champion = code;
  return true;
}
/** Novo (RAD-167 Neeko): quantas lendas extras o deck precisa escolher (0 = nenhuma). */
const extraNeed = (d: acc.SavedDeck) => needsExtraLegends(Object.keys(d.main).filter((c) => d.main[c] > 0));
/** Novo (Neeko): põe/tira `code` das lendas extras (nomes diferentes entre si e da lenda inicial). */
function toggleExtraLegend(d: acc.SavedDeck, code: string) {
  const ex = d.extraLegends || [];
  if (ex.includes(code)) {
    d.extraLegends = ex.filter((x) => x !== code);
    return;
  }
  const need = extraNeed(d);
  if (!need) return say('Lendas extras só com Neeko, Blending In no deck.');
  if (ex.length >= need) return say(`Já há ${need} lendas extras. Tire uma antes.`);
  const nm = cardData(code).name;
  if ((d.legend && cardData(d.legend).name === nm) || ex.some((x) => cardData(x).name === nm)) return say('As lendas extras precisam ter nomes diferentes (entre si e da lenda inicial).');
  d.extraLegends = [...ex, code];
}
function setLegend(d: acc.SavedDeck, code: string) {
  d.extraLegends = d.extraLegends?.filter((x) => x !== code); // novo (Neeko): a inicial não é extra
  d.legend = code;
  const tags = cardData(code).tags;
  if (d.champion && !cardData(d.champion).tags.some((t) => tags.includes(t))) d.champion = null;
  if (!d.champion)
    d.champion = Object.keys(d.main).find((c) => isChampionCard(c) && !isSignature(c) && cardData(c).tags.some((t) => tags.includes(t))) ?? null;
  // runas: se estiverem vazias (ou fora da identidade), 6/6 nos domínios da lenda
  const id = new Set(cardData(code).domains);
  const bad = Object.keys(d.runes).some((r) => d.runes[r] && !cardData(r).domains.every((x) => id.has(x)));
  if (!acc.count(d.runes) || bad) splitRunes(d);
  if (d.name === 'Novo deck') d.name = `Deck ${cardData(code).name.split(',')[0]}`;
  // aviso já na escolha da lenda: campeões com a tag dela
  const champs = championsFor(code);
  const tag = tags.join('/');
  if (!champs.length) say(`Atenção: nenhum campeão com a tag ${tag} na coleção — com esta lenda o deck não fica válido.`);
  else if (!d.champion) say(`Nenhum campeão com a tag ${tag} no deck ainda. Há ${champs.length} na coleção: use "Ver campeões" nas pendências.`);
}
/** Sugestão de runas: pela identidade da lenda e pelo power que as cartas do deck pedem de cada domínio. */
function suggestRunes(d: acc.SavedDeck): { runes: Record<string, number>; why: string } | null {
  if (!d.legend) return null;
  const doms = cardData(d.legend).domains as Domain[];
  const pw: Record<string, number> = {};
  const nc: Record<string, number> = {};
  for (const x of doms) (pw[x] = 0), (nc[x] = 0);
  for (const [c, n] of Object.entries(d.main)) {
    const cd = cardData(c);
    const ds = (cd.domains as Domain[]).filter((x) => doms.includes(x));
    if (!ds.length) continue;
    for (const x of ds) {
      nc[x] += n / ds.length;
      if (cd.power > 0) pw[x] += (n * cd.power) / ds.length;
    }
  }
  const base = Object.values(pw).some((v) => v > 0) ? pw : nc;
  const tot = doms.reduce((a, x) => a + base[x], 0);
  const cnt: Record<string, number> = {};
  if (doms.length === 1 || !tot) doms.forEach((x) => (cnt[x] = Math.floor(12 / doms.length) + (x === doms[0] ? 12 % doms.length : 0)));
  else {
    // proporcional, com pelo menos 3 de cada domínio que tem cartas no deck (para não travar o power dele)
    for (const x of doms) cnt[x] = Math.round((12 * base[x]) / tot);
    for (const x of doms) if (nc[x] > 0 && cnt[x] < 3) cnt[x] = 3;
    let sum = doms.reduce((a, x) => a + cnt[x], 0);
    while (sum !== 12) {
      const order = [...doms].sort((a, b) => (sum > 12 ? cnt[b] - cnt[a] : base[b] / (cnt[b] + 1) - base[a] / (cnt[a] + 1)));
      cnt[order[0]] += sum > 12 ? -1 : 1;
      sum += sum > 12 ? -1 : 1;
    }
  }
  // mantém a arte de runa que o deck já usa em cada domínio
  const runes: Record<string, number> = {};
  for (const x of doms) {
    if (!cnt[x]) continue;
    const have = Object.keys(d.runes).find((r) => d.runes[r] && cardData(r).domains.includes(x));
    runes[have ?? RUNE_OF[x]] = cnt[x];
  }
  const fmt = (x: Domain) => `${DOMAIN_PT[x]} ${Math.round(pw[x])} de power em ${Math.round(nc[x])} carta${Math.round(nc[x]) === 1 ? '' : 's'}`;
  const why = doms.length === 1 ? 'Lenda de um domínio só: as 12 runas são dele.' : `${doms.map(fmt).join(' · ')}.`;
  return { runes, why };
}
const RUNE_OF: Record<Domain, string> = { Fury: 'OGN-007', Calm: 'OGN-042', Mind: 'OGN-089', Body: 'OGN-126', Chaos: 'OGN-166', Order: 'OGN-214' };
function splitRunes(d: acc.SavedDeck) {
  if (!d.legend) return;
  const doms = cardData(d.legend).domains as Domain[];
  d.runes = {};
  if (doms.length === 1) d.runes[RUNE_OF[doms[0]]] = 12;
  else doms.forEach((x, i) => (d.runes[RUNE_OF[x]] = i === 0 ? 6 : 6));
}
/** Ação principal de uma carta da biblioteca (clique). */
function primary(d: acc.SavedDeck, code: string) {
  const cat = catOf(code);
  if (cat === 'legend') return setLegend(d, code);
  if (cat === 'battlefield') {
    if (d.battlefields.includes(code)) d.battlefields = d.battlefields.filter((x) => x !== code);
    else if (d.battlefields.length >= 3) say('O deck já tem 3 campos. Tire um antes.');
    else d.battlefields.push(code);
    return;
  }
  if (cat === 'rune') {
    if (acc.count(d.runes) >= 12) return say('O deck de runas já tem 12. Tire uma antes.');
    d.runes[code] = (d.runes[code] || 0) + 1;
    return;
  }
  addMain(d, code);
}
function removeOne(d: acc.SavedDeck, code: string, from: 'main' | 'side' | 'auto' = 'auto') {
  const cat = catOf(code);
  if (cat === 'battlefield') return void (d.battlefields = d.battlefields.filter((x) => x !== code));
  if (cat === 'legend') {
    if (d.legend === code) d.legend = null;
    return;
  }
  if (cat === 'rune') {
    if (d.runes[code]) d.runes[code]--;
    if (!d.runes[code]) delete d.runes[code];
    return;
  }
  const zone = from === 'auto' ? (d.main[code] ? 'main' : 'side') : from;
  const r = zone === 'main' ? d.main : d.side;
  if (!r[code]) return;
  r[code]--;
  if (!r[code]) delete r[code];
  if (zone === 'main' && d.champion === code && !d.main[code]) d.champion = null;
}
function moveZone(d: acc.SavedDeck, code: string, to: 'main' | 'side') {
  const from = to === 'main' ? d.side : d.main;
  if (!from[code]) return;
  if (to === 'side' && acc.count(d.side) >= 10) return say('O side já tem 10 cartas.');
  if (to === 'main' && isSignature(code) && sigCount(d) >= 3) return say('O deck já tem 3 cartas Signature.');
  from[code]--;
  if (!from[code]) delete from[code];
  const dest = to === 'main' ? d.main : d.side;
  dest[code] = (dest[code] || 0) + 1;
  if (to === 'side' && d.champion === code && !d.main[code]) d.champion = null;
  if (to === 'main' && !d.champion) addChampionIfFits(d, code);
}
function addChampionIfFits(d: acc.SavedDeck, code: string) {
  if (isChampionCard(code) && !isSignature(code) && legendTags(d).some((t) => cardData(code).tags.includes(t))) d.champion = code;
}

// ───────────────────────────── HTML ─────────────────────────────
const SETS: [string, string][] = [['OGN', 'Origins'], ['OGS', 'Proving Grounds'], ['SFD', 'Spiritforged'], ['UNL', 'Unleashed'], ['VEN', 'Vendetta'], ['RAD', 'Radiance']];
function img(code: string, cls = '') {
  const u = artUrl(code);
  return u ? `<img class="${cls}" src="${u}" alt="${esc(cardData(code).name)}" draggable="false" loading="lazy">` : '';
}
function chip(on: boolean, attr: string, label: string, style = '') {
  return `<button type="button" class="fchip${on ? ' on' : ''}" ${attr} ${style ? `style="${style}"` : ''} aria-pressed="${on}">${label}</button>`;
}
/** Ícone de domínio: o símbolo recortado da arte da runa (ou só a cor, enquanto a arte não chega). */
export function domIcon(x: Domain, cls = ''): string {
  const u = artUrl(RUNE_OF[x]);
  return `<i class="dom ${cls}" style="--c:${DOMAIN_COLOR[x]};${u ? `--rune:url(${u})` : ''}" title="${DOMAIN_PT[x]}" aria-hidden="true"></i>`;
}
export function domIcons(ds: Domain[], cls = ''): string {
  return ds.map((x) => domIcon(x, cls)).join('');
}
/** Códigos cuja arte as capas e os ícones usam (para o ensureArt). */
export const RUNE_CODES = Object.values(RUNE_OF);
/**
 * Capa de deck: a ilustração da lenda recortada, com a carta do campeão por cima e os domínios.
 * Usada na lista de decks, na tela inicial e na escolha de deck.
 */
export function coverArt(legend: string | null, champion: string | null, cover?: acc.DeckCover | null): string {
  const doms = legend ? (cardData(legend).domains as Domain[]) : [];
  // novo: capa escolhida (carta + recorte); sem ela, a lenda com o recorte padrão (CSS .cv-art)
  const code = cover?.code && hasCard(cover.code) ? cover.code : legend;
  const lu = code ? artUrl(code) : null;
  const cu = champion && code !== champion ? artUrl(champion) : null;
  const wide = !!code && kindOf(code) === 'battlefield';
  const crop = cover && code === cover.code ? ` style="--cx:${cover.x};--cy:${cover.y};--cz:${cover.z}"` : '';
  return `<span class="cv" style="--c1:${doms[0] ? DOMAIN_COLOR[doms[0]] : 'var(--line)'};--c2:${doms[1] ? DOMAIN_COLOR[doms[1]] : doms[0] ? DOMAIN_COLOR[doms[0]] : 'var(--line)'}">
    ${lu ? `<img class="cv-art${wide ? ' wide' : ''}"${crop} src="${lu}" alt="" draggable="false" loading="lazy">` : `<span class="cv-empty">${code ? esc(cardData(code).name) : '<i class="sigil"></i>'}</span>`}
    ${cu ? `<img class="cv-champ" src="${cu}" alt="" draggable="false" loading="lazy">` : ''}
    ${doms.length ? `<span class="cv-doms">${domIcons(doms)}</span>` : ''}
  </span>`;
}

function filtered(d: acc.SavedDeck | null): PoolCard[] {
  const q = db.q.trim().toLowerCase();
  let list = pool().filter((c) => {
    if (db.fit && d && !fits(d, c)) return false;
    if (db.domains.length && !c.domains.some((x) => db.domains.includes(x))) return false;
    if (db.cats.length && !db.cats.includes(c.cat)) return false;
    if (db.costs.length && !(['legend', 'battlefield', 'rune'].includes(c.cat) ? false : db.costs.includes(Math.min(7, c.energy)))) return false;
    if (db.set !== 'all' && c.set !== db.set) return false;
    if (db.rarity !== 'all' && c.rarity !== db.rarity) return false;
    if (db.kws.length && !db.kws.some((k) => c.kw.includes(k.toLowerCase()))) return false;
    if (q && !`${c.name} ${c.text} ${c.tags.join(' ')} ${c.code}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const by: Record<string, (a: PoolCard, b: PoolCard) => number> = {
    num: (a, b) => a.set.localeCompare(b.set) || a.num - b.num,
    cost: (a, b) => a.energy - b.energy || a.power - b.power || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    might: (a, b) => b.might - a.might || a.energy - b.energy,
  };
  list = [...list].sort(by[db.sort]);
  return list;
}

function tile(d: acc.SavedDeck, c: PoolCard): string {
  const inMain = d.main[c.code] || 0;
  const inSide = d.side[c.code] || 0;
  const url = artUrl(c.code);
  const legal = fits(d, c);
  let badge = '';
  let btns = '';
  let tip = 'Clique para pôr no deck · botão direito tira uma';
  let legendNote = '';
  if (c.cat === 'legend') {
    const on = d.legend === c.code;
    const xon = !!d.extraLegends?.includes(c.code); // novo (Neeko)
    badge = on ? '<span class="tbadge on">Sua lenda</span>' : xon ? '<span class="tbadge side">Extra (Neeko)</span>' : '';
    btns = on ? '<span class="tstate">Lenda do deck</span>' : `<button type="button" data-db="primary" class="wide">Usar como lenda</button>`;
    if (!on && (xon || extraNeed(d))) btns += `<button type="button" data-db="xleg" class="wide" title="Neeko, Blending In: lenda escolhida além da inicial">${xon ? 'Tirar das extras' : '+ Extra (Neeko)'}</button>`;
    tip = on ? 'Lenda do deck' : 'Clique para usar como lenda';
    // novo: quantos campeões com a tag desta lenda existem na coleção e quantos já estão no deck
    const ch = championsFor(c.code);
    const inDeck = ch.filter((x) => d.main[x]).length;
    legendNote = ch.length
      ? `<span class="tflag${inDeck ? ' good' : ''}" title="Campeões com a tag ${esc(c.tags.join('/'))}: ${esc(ch.map((x) => cardData(x).name).join(', '))}">${ch.length} campe${ch.length === 1 ? 'ão' : 'ões'}${inDeck ? ` · ${inDeck} no deck` : d.legend === c.code ? ' · nenhum no deck' : ''}</span>`
      : `<span class="tflag ban" title="Nenhuma unidade campeã com a tag ${esc(c.tags.join('/'))} na coleção">Sem campeão na coleção</span>`;
  } else if (c.cat === 'battlefield') {
    const on = d.battlefields.includes(c.code);
    badge = on ? '<span class="tbadge on">No deck</span>' : '';
    btns = `<button type="button" data-db="primary" class="wide${on ? '' : ' add'}">${on ? 'Tirar do deck' : 'Pôr no deck'}</button>`;
    tip = on ? 'Clique para tirar do deck' : 'Clique para pôr no deck';
  } else if (c.cat === 'rune') {
    const n = d.runes[c.code] || 0;
    badge = n ? `<span class="tbadge on">${n}</span>` : '';
    btns = `<button type="button" data-db="sub" ${n ? '' : 'disabled'} aria-label="Tirar uma">−</button><span class="tn">${n}</span><button type="button" data-db="primary" class="add" aria-label="Pôr uma">+</button>`;
  } else {
    const max = isUnique(c.code) ? 1 : 3;
    const champ = d.champion === c.code ? '<span class="tbadge champ">Campeão</span>' : '';
    badge = `${champ}${inMain ? `<span class="tbadge on">${inMain}<small>/${max}</small></span>` : ''}${inSide ? `<span class="tbadge side" title="${inSide} no side">S ${inSide}</span>` : ''}`;
    btns = `<button type="button" data-db="sub" ${inMain || inSide ? '' : 'disabled'} aria-label="Tirar uma">−</button><span class="tn">${inMain}</span><button type="button" data-db="primary" class="add" aria-label="Pôr uma no deck">+</button><button type="button" data-db="side" class="sidebtn" title="Pôr uma no side (até 10)">+ side</button>`;
  }
  const banned = BANNED_STANDARD[c.code] ? '<span class="tflag ban" title="Banida no formato Padrão">Banida</span>' : '';
  const noscript = !isImplemented(c.code) && c.cat !== 'rune' ? '<span class="tflag warn" title="Efeito ainda não programado">Sem efeito</span>' : '';
  return `<div class="dbcard c-${c.cat}${inMain || inSide || d.legend === c.code || d.battlefields.includes(c.code) || d.runes[c.code] ? ' used' : ''}${legal ? '' : ' illegal'}" data-dbcode="${c.code}">
    <div class="dbimg" data-db="look" title="${tip}">${url ? `<img src="${url}" alt="${esc(c.name)}" draggable="false" loading="lazy">` : `<div class="dbframe" style="--bar:${c.domains.map((x) => DOMAIN_COLOR[x]).join(',') || 'var(--line)'}"><b>${esc(c.name)}</b><span>${esc(cardData(c.code).type)}</span></div>`}
      <div class="tbadges">${badge}</div><div class="tflags">${legendNote}${banned}${noscript}${legal ? '' : '<span class="tflag">Fora da identidade</span>'}</div></div>
    <div class="dbbtns">${btns}</div>
  </div>`;
}

const anyFilter = () => !!(db.q || db.domains.length || db.cats.length || db.costs.length || db.kws.length || db.set !== 'all' || db.rarity !== 'all');
function filtersHtml(d: acc.SavedDeck): string {
  const doms = DOMAINS.map((x) => chip(db.domains.includes(x), `data-fdom="${x}" title="${DOMAIN_PT[x]}"`, `${domIcon(x)}<span>${DOMAIN_PT[x]}</span>`, `--c:${DOMAIN_COLOR[x]}`)).join('');
  const cats = (Object.keys(CAT_PT) as Cat[]).map((k) => chip(db.cats.includes(k), `data-fcat="${k}"`, CAT_PT[k])).join('');
  const costs = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => chip(db.costs.includes(n), `data-fcost="${n}" aria-label="Custo ${n === 7 ? '7 ou mais' : n}"`, n === 7 ? '7+' : String(n))).join('');
  const sets = chip(db.set === 'all', 'data-fset="all"', 'Todas') + SETS.map(([k, nm]) => chip(db.set === k, `data-fset="${k}"`, nm)).join('');
  const kws = KEYWORDS.map((k) => chip(db.kws.includes(k), `data-fkw="${k}"`, k)).join('');
  const extra = (db.cats.length ? 1 : 0) + (db.set !== 'all' ? 1 : 0) + (db.rarity !== 'all' ? 1 : 0) + (db.costs.length ? 1 : 0) + (db.kws.length ? 1 : 0);
  return `<div class="dbfilters${db.more ? ' more' : ''}">
    <div class="frow fsearch"><div class="qwrap"><input id="dbq" type="search" placeholder="Buscar carta" title="Busca no nome, no texto e nas tags" value="${esc(db.q)}" autocomplete="off" aria-label="Buscar carta"><kbd>/</kbd></div>
      <select id="dbsort" aria-label="Ordenar"><option value="num" ${db.sort === 'num' ? 'selected' : ''}>Ordem da coleção</option><option value="cost" ${db.sort === 'cost' ? 'selected' : ''}>Por custo</option><option value="name" ${db.sort === 'name' ? 'selected' : ''}>Por nome</option><option value="might" ${db.sort === 'might' ? 'selected' : ''}>Por Might</option></select>
      <button type="button" class="fmore" data-db="more" aria-expanded="${db.more}">Filtros${extra ? ` <b>${extra}</b>` : ''}</button></div>
    <div class="frow fdoms">${doms}<span class="flabel fcost-in">Custo</span>${costs.replace(/class="fchip/g, 'class="fcost-in fchip')}</div>
    <div class="fextra">
      <div class="frow fcostrow" role="group" aria-label="Custo"><span class="flabel">Custo</span>${costs}</div>
      <div class="frow" role="group" aria-label="Tipo"><span class="flabel">Tipo</span>${cats}</div>
      <div class="frow fkw" role="group" aria-label="Palavra-chave"><span class="flabel">Palavra-chave</span>${kws}</div>
      <div class="frow" role="group" aria-label="Coleção"><span class="flabel">Coleção</span>${sets}<select id="dbrar" aria-label="Raridade"><option value="all">Toda raridade</option>${[['Common', 'Comum'], ['Uncommon', 'Incomum'], ['Rare', 'Rara'], ['Epic', 'Épica']].map(([r, pt]) => `<option value="${r}" ${db.rarity === r ? 'selected' : ''}>${pt}</option>`).join('')}</select></div>
    </div>
  </div>`;
}

function curveHtml(d: acc.SavedDeck): string {
  const b = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const [c, n] of Object.entries(d.main)) b[Math.min(7, cardData(c).energy)] += n;
  const max = Math.max(1, ...b);
  return `<div class="curve" role="img" aria-label="Curva de energia: ${b.map((n, i) => `${n} de custo ${i === 7 ? '7+' : i}`).join(', ')}">${b
    .map((n, i) => `<div class="cb"><span class="cbn">${n || ''}</span><i style="height:${Math.round((n / max) * 100)}%"></i><span class="cbl">${i === 7 ? '7+' : i}</span></div>`)
    .join('')}</div>`;
}

function rowsHtml(d: acc.SavedDeck, zone: 'main' | 'side'): string {
  const r = zone === 'main' ? d.main : d.side;
  const entries = Object.entries(r).filter(([, n]) => n > 0);
  if (!entries.length) return `<p class="muted small emptyrow">${zone === 'main' ? 'Clique nas cartas da biblioteca para pôr no deck.' : 'Use "+ side" numa carta da biblioteca para pôr no side (até 10).'}</p>`;
  const groups: [string, Cat[]][] = [['Campeões', ['champion']], ['Unidades', ['unit']], ['Spells', ['spell', 'signature']], ['Gear', ['gear']]];
  return groups
    .map(([label, cats]) => {
      const rows = entries
        .filter(([c]) => cats.includes(catOf(c)))
        .sort(([a], [b]) => cardData(a).energy - cardData(b).energy || cardData(a).name.localeCompare(cardData(b).name));
      if (!rows.length) return '';
      const total = rows.reduce((s, [, n]) => s + n, 0);
      return `<div class="dgroup"><div class="dgl">${label} <span>${total}</span></div>${rows
        .map(([c, n]) => {
          const cd = cardData(c);
          const champ = d.champion === c;
          const canChamp = zone === 'main' && isChampionCard(c) && !isSignature(c) && legendTags(d).some((t) => cd.tags.includes(t));
          const u = artUrl(c);
          return `<div class="drow" data-dbcode="${c}" data-zone="${zone}"${u ? ` style="--art:url(${u})"` : ''}>
            <span class="dcost" style="--c:${(cd.domains as Domain[]).map((x) => DOMAIN_COLOR[x]).join(',') || 'var(--line)'}">${cd.energy}</span>
            <span class="dname" data-db="look">${esc(cd.name)}${champ ? ' <b class="champtag">campeão</b>' : canChamp ? ' <button type="button" class="link small" data-db="champ">escolher como campeão</button>' : ''}</span>
            <span class="dn">${n}×</span>
            <span class="dbtns"><button type="button" data-db="rsub" aria-label="Tirar uma">−</button><button type="button" data-db="radd" aria-label="Pôr mais uma">+</button><button type="button" data-db="${zone === 'main' ? 'toside' : 'tomain'}" title="${zone === 'main' ? 'Mandar uma para o side' : 'Trazer uma para o principal'}">${zone === 'main' ? '→ side' : '→ deck'}</button></span>
          </div>`;
        })
        .join('')}</div>`;
    })
    .join('');
}

/** Pendência do deck com o botão que leva direto à solução. */
function errHtml(d: acc.SavedDeck, e: string): string {
  let fix = '';
  if (/^Escolha uma lenda/.test(e)) fix = '<button type="button" data-db="fix" data-fix="legend">Ver lendas</button>';
  else if (/^Escolha o campeão|campeão escolhido/.test(e)) fix = d.legend ? '<button type="button" data-db="fix" data-fix="champion">Ver campeões</button>' : '';
  else if (/runas/i.test(e) && d.legend) fix = '<button type="button" data-db="split">Dividir igual</button>';
  else if (/\bcampos?\b/i.test(e) && d.battlefields.length < 3) fix = '<button type="button" data-db="fix" data-fix="bf">Ver campos</button>';
  else if (/deck principal tem/.test(e)) fix = '<button type="button" data-db="fix" data-fix="main">Ver cartas</button>';
  return `<li><span>${esc(e)}</span>${fix}</li>`;
}

function meter(label: string, n: number, goal: number, okWhen: boolean, over = false): string {
  return `<div class="meter${okWhen ? ' ok' : over ? ' over' : ''}"><span class="ml">${label}</span><span class="mv"><b>${n}</b>/${goal}</span><i style="--p:${Math.min(100, Math.round((n / goal) * 100))}%"></i></div>`;
}

function deckPanel(d: acc.SavedDeck): string {
  const v = acc.validate(d);
  const slot = (code: string | null, label: string, fix: string) =>
    code
      ? `<div class="slotcard" data-dbcode="${code}" data-db="peek" title="${esc(cardData(code).name)}">${img(code) || `<span>${esc(cardData(code).name)}</span>`}<span class="sl">${label}</span></div>`
      : `<button type="button" class="slotcard empty" data-db="fix" data-fix="${fix}">${label}<small>${fix === 'legend' ? 'escolher' : d.legend ? 'escolher' : 'depois da lenda'}</small></button>`;
  const runes = d.legend
    ? (cardData(d.legend).domains as Domain[])
        .map((x) => {
          const code = RUNE_OF[x];
          const n = d.runes[code] || 0;
          return `<div class="rrowb" data-dbcode="${code}">${domIcon(x)}Runa de ${DOMAIN_PT[x]}<span class="dn">${n}</span><span class="dbtns"><button type="button" data-db="rsub" aria-label="Tirar uma">−</button><button type="button" data-db="radd" aria-label="Pôr uma">+</button></span></div>`;
        })
        .join('')
    : '<p class="muted small">As runas seguem os domínios da lenda.</p>';
  const bfs =
    d.battlefields
      .map((c) => `<div class="bfslot" data-dbcode="${c}">${img(c) || ''}<span>${esc(cardData(c).name)}</span><button type="button" data-db="sub" aria-label="Tirar ${esc(cardData(c).name)}">×</button></div>`)
      .join('') + Array.from({ length: Math.max(0, 3 - d.battlefields.length) }, () => '<button type="button" class="bfslot empty" data-db="fix" data-fix="bf">+ Campo</button>').join('');
  const status = v.ok
    ? `<p class="dkok">Pronto para jogar.${v.banned.length ? ` <span class="muted">Banidas no Padrão (valem no Casual): ${v.banned.map(esc).join(', ')}.</span>` : ''}</p>`
    : `<div class="dkerrs"><p>Falta${v.errors.length > 1 ? 'm' : ''} ${v.errors.length} coisa${v.errors.length > 1 ? 's' : ''} para jogar</p><ul>${v.errors.map((e) => errHtml(d, e)).join('')}</ul></div>`;
  const doms = d.legend ? (cardData(d.legend).domains as Domain[]) : [];
  const lu = d.cover?.code && hasCard(d.cover.code) ? artUrl(d.cover.code) : d.legend ? artUrl(d.legend) : null;
  const rec = acc.deckRecord(d);
  const origin = d.origin ? acc.getDeck(d.origin) : null;
  return `<div class="dbdeck">
    <div class="dkhead"${lu ? ` style="--art:url(${lu})"` : ''}>
      <button type="button" class="dkcover" data-db="cover" ${d.legend ? '' : 'disabled'} title="Escolher a carta da capa e o recorte">Capa</button>
      <div class="dktitle"><input id="dbname" value="${esc(d.name)}" maxlength="40" aria-label="Nome do deck" title="Clique para renomear">
        <p class="dksub">${domIcons(doms)}${d.legend ? esc(cardData(d.legend).name) : 'Sem lenda'}${rec.g ? ` <span class="rec">${rec.w}V ${rec.l}D</span>` : ''}</p></div>
      <div class="slots">${slot(d.legend, 'Lenda', 'legend')}${slot(d.champion, 'Campeão', 'champion')}</div>
    </div>
    <div class="meters">${meter('Principal', acc.count(d.main), 40, acc.count(d.main) >= 40)}${meter('Runas', acc.count(d.runes), 12, acc.count(d.runes) === 12, acc.count(d.runes) > 12)}${meter('Campos', d.battlefields.length, 3, d.battlefields.length === 3)}${meter('Side', acc.count(d.side), 10, false, acc.count(d.side) > 10)}</div>
    ${db.note ? `<p class="dbnote" role="status">${esc(db.note)}</p>` : ''}
    ${status}
    <div class="dkacts"><button type="button" class="primary" data-db="play" ${v.ok ? '' : 'disabled'}>Jogar com este deck</button><button type="button" data-db="sample" ${acc.count(d.main) >= 4 ? '' : 'disabled'}>Mão de teste</button></div>
    <div class="dkexport"><span>Exportar</span><button type="button" data-db="copycode" ${d.legend ? '' : 'disabled'}>Copiar código</button><button type="button" data-db="copytext" ${d.legend ? '' : 'disabled'}>Copiar lista</button></div>
    <div class="dkexport"><span>Versões</span><button type="button" data-db="compare" ${acc.profile().decks.length > 1 ? '' : 'disabled'} title="Ver as cartas que mudam entre este deck e outro">${origin ? `Comparar com a original` : 'Comparar com outro deck'}</button><button type="button" data-db="dupedit" title="Faz uma cópia para testar mudanças sem perder esta versão">Duplicar</button></div>
    ${musicRowHtml(d)}
    ${db.sample.length ? `<div class="sample"><div class="dgl">Mão inicial de teste <button type="button" class="link small" data-db="sample">sortear de novo</button> <button type="button" class="link small" data-db="nosample">fechar</button></div><div class="srow">${db.sample.map((c) => `<div class="scard" data-dbcode="${c}" data-db="peek">${img(c) || `<span>${esc(cardData(c).name)}</span>`}</div>`).join('')}</div></div>` : ''}
    ${extraLegendsHtml(d)}
    <div class="dsec"><div class="dgl">Curva de energia <span>deck principal</span></div>${curveHtml(d)}</div>
    <div class="dsec"><div class="dgl">Campos de batalha <span>${d.battlefields.length}/3</span></div><div class="bfslots">${bfs}</div></div>
    <div class="dsec"><div class="dgl">Runas <span>${acc.count(d.runes)}/12</span>${d.legend ? '<button type="button" class="link small" data-db="runesug" title="Calcula pelas cores das cartas e pelo power que elas pedem">sugerir</button><button type="button" class="link small dsplit" data-db="split">dividir igual</button>' : ''}</div>${runes}${runeSugHtml(d)}</div>
    <div class="dsec"><div class="dgl big">Deck principal <span>${acc.count(d.main)}</span></div>${rowsHtml(d, 'main')}</div>
    <div class="dsec"><div class="dgl big">Side <span>${acc.count(d.side)}/10</span></div>${rowsHtml(d, 'side')}</div>
    ${statsHtml(d)}
  </div>`;
}

function runeSugHtml(d: acc.SavedDeck): string {
  const sg = db.runeSug;
  if (!sg) return '';
  const same = Object.keys({ ...sg.runes, ...d.runes }).every((r) => (sg.runes[r] || 0) === (d.runes[r] || 0));
  const parts = Object.entries(sg.runes).map(([r, n]) => `${domIcon(cardData(r).domains[0] as Domain)}<b>${n}</b> ${DOMAIN_PT[cardData(r).domains[0] as Domain]}`).join(' ');
  return `<div class="runesug"><p><span class="rsl">Sugestão</span> ${parts}</p><p class="muted small">${esc(sg.why)}</p>
    <div class="btns">${same ? '<span class="ok small">As runas já estão assim.</span>' : '<button type="button" class="primary" data-db="runeapply">Aplicar</button>'}<button type="button" data-db="runeclose">Fechar</button></div></div>`;
}

const pct = (w: number, g: number) => (g ? `${Math.round((100 * w) / g)}%` : '—');
/** Estatísticas do deck: vitória geral e por lenda adversária, duração e desempenho de cada carta. */
function statsHtml(d: acc.SavedDeck): string {
  const r = acc.deckRecord(d);
  const head = `<button type="button" class="dgl big dsttog" data-db="statsopen" aria-expanded="${db.statsOpen}">Estatísticas <span>${r.g ? `${r.g} partida${r.g === 1 ? '' : 's'} · ${pct(r.w, r.g)} de vitória` : 'sem partidas'}</span><i aria-hidden="true">${db.statsOpen ? '−' : '+'}</i></button>`;
  if (!db.statsOpen) return `<div class="dsec dstats">${head}</div>`;
  if (!r.g)
    return `<div class="dsec dstats">${head}<p class="muted small">Termine partidas com este deck (contra a IA, online ou como Jogador 1 no passa-e-joga) para ver a taxa de vitória, a duração e o desempenho de cada carta.</p></div>`;
  const st = d.stats;
  const vs = st
    ? Object.entries(st.vs)
        .sort((a, b) => b[1].g - a[1].g)
        .map(([lg, v]) => {
          const nm = hasCard(lg) ? cardData(lg).name : lg;
          return `<div class="vsrow" data-dbcode="${hasCard(lg) ? lg : ''}"><span class="vsn">${hasCard(lg) ? domIcons(cardData(lg).domains as Domain[]) : ''}${esc(nm)}</span><span class="vsbar"><i style="--p:${Math.round((100 * v.w) / v.g)}%"></i></span><span class="vsv">${pct(v.w, v.g)} <small>${v.w}V ${v.g - v.w}D</small></span></div>`;
        })
        .join('')
    : '';
  const codes = Object.keys(d.main).filter((c) => d.main[c] > 0);
  const rows = codes
    .map((c) => ({ c, x: st?.cards[c] }))
    .sort((a, b) => (b.x?.p || 0) - (a.x?.p || 0) || cardData(a.c).energy - cardData(b.c).energy)
    .map(({ c, x }) => {
      const g = x?.g || 0;
      const deadRate = g ? x!.d / g : 0;
      return `<tr data-dbcode="${c}"><td class="stn" data-db="look">${esc(cardData(c).name)}</td><td title="${g ? `jogada ${x!.p} vez(es) em ${g} partida(s) com ela no deck` : 'sem partidas registradas com ela'}">${g ? x!.p : '—'}</td><td>${x?.p ? (x.t / x.p).toFixed(1) : '—'}</td><td class="${g >= 2 && deadRate >= 0.5 ? 'deadc' : ''}" title="${g ? `${x!.d} cópia(s) na mão no fim, em ${g} partida(s)` : ''}">${g ? x!.d : '—'}</td></tr>`;
    })
    .join('');
  const since = st && st.g > (st.tg || 0) ? `<p class="muted small">As ${st.g - st.tg} partidas de antes desta versão do jogo só contam no placar.</p>` : '';
  return `<div class="dsec dstats">${head}
    <div class="stfig"><div><b>${pct(r.w, r.g)}</b><span>vitórias · ${r.w}V ${r.l}D</span></div><div><b>${r.avgTurns ? r.avgTurns.toFixed(1) : '—'}</b><span>turnos em média</span></div><div><b>${r.g}</b><span>partida${r.g === 1 ? '' : 's'}</span></div></div>
    ${vs ? `<div class="dgl">Contra cada lenda</div><div class="vslist">${vs}</div>` : ''}
    <div class="dgl">Cartas <span>do deck atual</span></div>
    <table class="sttab"><thead><tr><th>Carta</th><th title="Vezes que foi jogada">Jogada</th><th title="Turno médio (seu) em que foi jogada">Turno</th><th title="Cópias que ficaram na mão no fim da partida (carta morta)">Morta</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="muted small">Turno = o seu turno em que a carta foi jogada, em média. Morta = cópias que ficaram na mão no fim; em vermelho quando sobra em metade das partidas ou mais.</p>${since}
    <button type="button" class="link small" data-db="histdeck">Ver as partidas deste deck no histórico</button>
  </div>`;
}

// ───────────────────────────── comparar versões ─────────────────────────────
type DiffRow = { code: string; n: number };
function diffRec(a: Record<string, number>, b: Record<string, number>): DiffRow[] {
  const out: DiffRow[] = [];
  for (const c of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const n = (a[c] || 0) - (b[c] || 0);
    if (n) out.push({ code: c, n });
  }
  return out.sort((x, y) => cardData(x.code).energy - cardData(y.code).energy || cardData(x.code).name.localeCompare(cardData(y.code).name));
}
const asRec = (l: (string | null | undefined)[]) => {
  const r: Record<string, number> = {};
  for (const c of l) if (c) r[c] = (r[c] || 0) + 1;
  return r;
};
export function deckDiff(a: acc.SavedDeck, b: acc.SavedDeck): [string, DiffRow[]][] {
  return [
    ['Lenda', diffRec(asRec([a.legend]), asRec([b.legend]))],
    ['Campeão escolhido', diffRec(asRec([a.champion]), asRec([b.champion]))],
    ['Deck principal', diffRec(a.main, b.main)],
    ['Side', diffRec(a.side, b.side)],
    ['Runas', diffRec(a.runes, b.runes)],
    ['Campos', diffRec(asRec(a.battlefields), asRec(b.battlefields))],
    ['Lendas extras', diffRec(asRec(a.extraLegends || []), asRec(b.extraLegends || []))],
  ];
}
function compareHtml(d: acc.SavedDeck): string {
  const others = acc.profile().decks.filter((x) => x.id !== d.id);
  const other = acc.getDeck(db.compareWith) ?? (d.origin ? acc.getDeck(d.origin) : null) ?? others[0] ?? null;
  const opts = others.map((o) => `<option value="${o.id}" ${o.id === other?.id ? 'selected' : ''}>${esc(o.name)}${o.id === d.origin ? ' · original' : ''}${o.origin === d.id ? ' · cópia deste' : ''}</option>`).join('');
  let body = '<p class="muted">Não há outro deck na conta para comparar.</p>';
  if (other) {
    const secs = deckDiff(d, other).filter(([, rows]) => rows.length);
    const nAdd = secs.reduce((a, [, r]) => a + r.filter((x) => x.n > 0).reduce((s2, x) => s2 + x.n, 0), 0);
    const nSub = secs.reduce((a, [, r]) => a + r.filter((x) => x.n < 0).reduce((s2, x) => s2 - x.n, 0), 0);
    const row = (x: DiffRow) => `<li class="${x.n > 0 ? 'plus' : 'minus'}" data-dbcode="${x.code}"><b>${x.n > 0 ? '+' : '−'}${Math.abs(x.n)}</b> <span data-db="look">${esc(cardData(x.code).name)}</span></li>`;
    body = secs.length
      ? `<p class="cmpsum"><span class="plus">+${nAdd}</span> neste deck · <span class="minus">−${nSub}</span> só em "${esc(other.name)}"</p>
        <div class="cmpgrid">${secs.map(([t, rows]) => `<section><h3>${t}</h3><ul>${rows.map(row).join('')}</ul></section>`).join('')}</div>`
      : `<p class="ok">Os dois decks têm exatamente as mesmas cartas.</p>`;
  }
  return `<div class="modal dbm" data-db="closemodal"><div class="mbox cmpbox" role="dialog" aria-label="Comparar decks">
    <div class="pkhead"><h2>Comparar versões</h2><button type="button" data-db="closemodal">Fechar</button></div>
    <div class="cmphead"><b>${esc(d.name)}</b><span class="muted">comparado com</span>${others.length ? `<select id="dbcmp" aria-label="Deck para comparar">${opts}</select>` : ''}</div>
    <p class="muted small">+ = cartas a mais neste deck; − = cartas que só o outro tem (ou tem mais cópias).</p>
    ${body}
  </div></div>`;
}

// ───────────────────────────── capa ─────────────────────────────
const COVER_DEFAULT = { x: 0.6, y: 0.3, z: 1.25 };
const COVER_WIDE = { x: 0.5, y: 0.45, z: 1 };
const rerender = () => hooks.render();
/** Música da partida deste deck (temas de tabuleiro do Legends of Runeterra; só no site, que tem a pasta music/). */
let previewing = false;
function musicRowHtml(d: acc.SavedDeck): string {
  loadMusic(rerender);
  const bs = musicBoards();
  if (!bs.length) return '';
  const cur = d.music ?? '';
  const opt = (v: string, label: string) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const opts = [opt('', 'Sorteada a cada partida'), opt('none', 'Sem música'), ...bs.map((b) => opt(b.id, b.name))].join('');
  const can = cur && cur !== 'none';
  return `<div class="dkexport dkmusic"><span>Música</span><select id="dbmusic" title="Música que toca nas suas partidas com este deck">${opts}</select><button type="button" data-db="musicprev" ${can ? '' : 'disabled'} title="Ouvir a trilha escolhida">${previewing && can ? '■ Parar' : '▶ Ouvir'}</button></div>`;
}

const coverDefault = (code: string) => (kindOf(code) === 'battlefield' ? COVER_WIDE : COVER_DEFAULT);
function coverHtml(d: acc.SavedDeck): string {
  const cur = d.cover && hasCard(d.cover.code) ? d.cover : null;
  const code = cur?.code ?? d.legend ?? '';
  const v = cur ?? (code ? { code, ...coverDefault(code) } : { code: '', ...COVER_DEFAULT });
  const cands: string[] = [];
  const push = (c: string | null | undefined) => c && hasCard(c) && !cands.includes(c) && cands.push(c);
  push(d.legend);
  push(d.champion);
  (d.extraLegends || []).forEach(push);
  const mainSorted = Object.keys(d.main).sort((a, b) => ['champion', 'signature', 'unit', 'gear', 'spell'].indexOf(catOf(a)) - ['champion', 'signature', 'unit', 'gear', 'spell'].indexOf(catOf(b)) || cardData(b).energy - cardData(a).energy);
  mainSorted.forEach(push);
  d.battlefields.forEach(push);
  const cand = (c: string) => `<button type="button" class="cvc${c === code ? ' on' : ''}${kindOf(c) === 'battlefield' ? ' wide' : ''}" data-db="cvpick" data-code="${c}" title="${esc(cardData(c).name)}" aria-pressed="${c === code}">${img(c) || `<span>${esc(cardData(c).name)}</span>`}</button>`;
  const sl = (id: string, label: string, val: number, min: number, max: number) => `<label class="cvs"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" value="${Math.round(val * 100)}"></label>`;
  return `<div class="modal dbm" data-db="closemodal"><div class="mbox cvbox" role="dialog" aria-label="Capa do deck">
    <div class="pkhead"><h2>Capa do deck</h2><button type="button" class="primary" data-db="closemodal">Pronto</button></div>
    <div class="cvlay">
      <div class="cvprev" id="cvprev">${coverArt(d.legend, d.champion, cur)}<div class="cvprev2">${coverArt(d.legend, d.champion, cur)}</div></div>
      <div class="cvctl">
        ${sl('cvy', 'Altura', v.y, 0, 100)}${sl('cvz', 'Zoom', v.z, 100, 250)}${sl('cvx', 'Lado', v.x, 0, 100)}
        <div class="btns"><button type="button" data-db="cvreset" ${cur ? '' : 'disabled'}>Voltar ao padrão</button></div>
        <p class="muted small">A capa aparece em Meus decks, na tela inicial e na escolha de deck. Sem escolha, é a lenda.</p>
      </div>
    </div>
    <h3>Carta da capa</h3><div class="cvcands">${cands.map(cand).join('')}</div>
  </div></div>`;
}
/** Sliders da capa: atualiza a prévia sem redesenhar. */
function coverInput(d: acc.SavedDeck, id: string, val: number) {
  const code = d.cover?.code ?? d.legend;
  if (!code) return;
  const c = d.cover ?? { code, ...coverDefault(code) };
  if (id === 'cvy') c.y = val / 100;
  else if (id === 'cvx') c.x = val / 100;
  else if (id === 'cvz') c.z = val / 100;
  d.cover = c;
  document.querySelectorAll<HTMLElement>('#cvprev .cv-art').forEach((el) => {
    el.style.setProperty('--cx', String(c.x));
    el.style.setProperty('--cy', String(c.y));
    el.style.setProperty('--cz', String(c.z));
  });
}

/** Novo (RAD-167 Neeko): as lendas escolhidas além da inicial. */
function extraLegendsHtml(d: acc.SavedDeck): string {
  const need = extraNeed(d);
  const ex = d.extraLegends || [];
  if (!need && !ex.length) return '';
  const slots =
    ex.map((c) => `<div class="bfslot" data-dbcode="${c}">${img(c) || ''}<span>${esc(cardData(c).name)}</span><button type="button" data-db="xleg" aria-label="Tirar ${esc(cardData(c).name)}">×</button></div>`).join('') +
    Array.from({ length: Math.max(0, need - ex.length) }, () => '<button type="button" class="bfslot empty" data-db="fix" data-fix="legend">+ Lenda extra</button>').join('');
  return `<div class="dsec"><div class="dgl">Lendas extras (Neeko, Blending In) <span>${ex.length}/${need}</span></div>
    <p class="muted small">${need ? 'Escolha lendas com nomes diferentes na biblioteca ("Lenda extra (Neeko)"). Ao jogar Neeko, uma delas vai para a sua Legend Zone enquanto ela estiver no tabuleiro.' : 'Sem Neeko, Blending In no deck: estas lendas não valem.'}</p>
    <div class="bfslots">${slots}</div></div>`;
}

/** Prévia grande da carta (computador): aparece ao lado da carta apontada. */
function peekInner(code: string): string {
  const c = cardData(code);
  const wide = kindOf(code) === 'battlefield';
  return `<div class="dbpeek-in${wide ? ' wide' : ''}">${img(code, 'big')}
    <div class="dbptext"><b>${esc(c.name)}</b><span class="muted">${esc(c.type)} · ${(c.domains as Domain[]).map((x) => DOMAIN_PT[x]).join('/') || 'sem domínio'}${c.might ? ` · Might ${c.might}` : ''}</span>
    <p>${rulesHtml(c.text) || '<span class="muted">sem texto</span>'}</p>${c.errata ? '<p class="note">Com a errata oficial mais recente.</p>' : ''}
    ${BANNED_STANDARD[code] ? '<p class="note warn">Banida no formato Padrão.</p>' : ''}<p class="code">${esc(code)} · ${esc(c.rarity)}</p></div></div>`;
}

function zoomHtml(d: acc.SavedDeck | null): string {
  if (!db.zoom) return '';
  const code = db.zoom;
  const c = cardData(code);
  const cat = catOf(code);
  let acts = '';
  if (d) {
    if (cat === 'legend') {
      acts = d.legend === code ? '<p class="muted">É a lenda do deck.</p>' : '<button type="button" class="primary" data-db="primary">Usar como lenda</button>';
      const xon = !!d.extraLegends?.includes(code); // novo (Neeko)
      if (d.legend !== code && (xon || extraNeed(d))) acts += `<button type="button" data-db="xleg">${xon ? 'Tirar das lendas extras' : 'Lenda extra (Neeko)'}</button>`;
    }
    else if (cat === 'battlefield') acts = `<button type="button" class="primary" data-db="primary">${d.battlefields.includes(code) ? 'Tirar do deck' : 'Pôr no deck'}</button>`;
    else if (cat === 'rune') acts = `<button type="button" data-db="sub">− Tirar</button><b class="zn">${d.runes[code] || 0}</b><button type="button" class="primary" data-db="primary">+ Pôr</button>`;
    else
      acts = `<button type="button" data-db="sub" aria-label="Tirar uma">−</button><b class="zn">${d.main[code] || 0}${d.side[code] ? ` <small>+ ${d.side[code]} no side</small>` : ''}</b><button type="button" class="primary" data-db="primary">+ Deck</button><button type="button" data-db="side">+ Side</button>`;
  }
  return `<div class="modal zoom" data-db="closezoom"><div class="mbox" role="dialog" aria-label="${esc(c.name)}" data-dbcode="${code}">
    ${img(code, 'big')}
    <div class="dbptext"><b>${esc(c.name)}</b> <span class="muted">${esc(c.type)}</span><p>${rulesHtml(c.text)}</p></div>
    <div class="zacts">${acts}</div>
    <div class="btns"><button type="button" data-db="closezoom">Fechar</button></div></div></div>`;
}

function deckTile(d: acc.SavedDeck): string {
  const v = acc.validate(d);
  const del =
    db.confirmDelete === d.id
      ? `<span class="delask">Excluir mesmo?</span><button type="button" class="danger" data-db="delyes" data-deck="${d.id}">Excluir</button><button type="button" data-db="delno">Manter</button>`
      : `<button type="button" class="link" data-db="del" data-deck="${d.id}">Excluir</button>`;
  const status = v.ok
    ? '<span class="ok">Pronto para jogar</span>'
    : `<span class="err" title="${esc(v.errors.join('\n'))}">${esc(v.errors[0])}${v.errors.length > 1 ? ` <small>(+${v.errors.length - 1})</small>` : ''}</span>`;
  const r = acc.deckRecord(d);
  const rec = r.g ? `<span class="rec" title="Vitórias e derrotas com este deck">${r.w}V ${r.l}D</span>` : '';
  const origin = d.origin ? acc.getDeck(d.origin) : null;
  const statLine = r.g ? `<p class="dtstats small"><b>${pct(r.w, r.g)}</b> de vitória em ${r.g} partida${r.g === 1 ? '' : 's'}${r.avgTurns ? ` · ${r.avgTurns.toFixed(1)} turnos em média` : ''}</p>` : '';
  return `<article class="decktile${v.ok ? ' ready' : ' todo'}">
    <button type="button" class="dtcover" data-db="edit" data-deck="${d.id}" aria-label="Editar ${esc(d.name)}">${coverArt(d.legend, d.champion, d.cover)}</button>
    <div class="dtinfo">
      <h3><button type="button" class="dtname" data-db="edit" data-deck="${d.id}">${esc(d.name)}</button>${rec}</h3>
      <p class="muted small">${d.legend ? esc(cardData(d.legend).name) : 'Sem lenda'} · ${acc.count(d.main)} cartas${acc.count(d.side) ? ` + ${acc.count(d.side)} no side` : ''}</p>
      <p class="dtstatus small">${status}</p>${statLine}
      ${origin ? `<p class="dtorigin small">Cópia de ${esc(origin.name)} · <button type="button" class="link" data-db="cmpdeck" data-deck="${d.id}">comparar</button></p>` : ''}
      <div class="dtacts">${v.ok ? `<button type="button" class="primary" data-db="playdeck" data-deck="${d.id}">Jogar</button><button type="button" data-db="edit" data-deck="${d.id}">Editar</button>` : `<button type="button" class="primary" data-db="edit" data-deck="${d.id}">Completar</button><button type="button" data-db="playdeck" data-deck="${d.id}" disabled>Jogar</button>`}</div>
      <div class="dtmore"><button type="button" class="link" data-db="copydeck" data-deck="${d.id}" ${d.legend ? '' : 'disabled'}>Copiar código</button><button type="button" class="link" data-db="copydecktext" data-deck="${d.id}" ${d.legend ? '' : 'disabled'}>Copiar lista</button><button type="button" class="link" data-db="dup" data-deck="${d.id}">Duplicar</button>${r.g ? `<button type="button" class="link" data-db="histdeck" data-deck="${d.id}">Partidas</button>` : ''}${del}</div>
    </div></article>`;
}

function listHtml(): string {
  const p = acc.profile();
  const decks = [...p.decks].sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(deckTile).join('');
  const others = acc.profiles();
  const starters = DECKS.map(
    (d, i) => `<button type="button" class="starter" data-db="starter" data-i="${i}">${coverArt(d.legend, d.champion)}<span class="stname">Copiar starter ${esc(d.name.split(' ')[0])}<small>${esc(d.name.replace(/^[^(]*\(|\)$/g, ''))}</small></span></button>`,
  ).join('');
  return `<section class="dblist">
    <div class="dbhead"><div><h1>Meus decks</h1><p class="muted">${p.decks.length ? `${p.decks.length} deck${p.decks.length > 1 ? 's' : ''} na conta de ${esc(p.name)}` : `Conta de ${esc(p.name)}`}</p></div>
      <div class="btns"><button type="button" class="primary" data-db="new">Novo deck</button><button type="button" data-db="import" aria-expanded="${db.importOpen}">Importar código ou lista</button><button type="button" data-db="history">Histórico</button></div></div>
    ${db.importOpen ? `<div class="importbox mz"><label for="dbimport">Cole o código do deck ou a lista em texto (Legend:, Champion:, MainDeck:, Battlefields:, Rune Pool:, Sideboard:). Serve o que vem do Piltover Archive, do TCG Arena e afins.</label><textarea id="dbimport" rows="8" placeholder="CIAAAAAAAAAQ...&#10;&#10;ou&#10;&#10;Legend:&#10;1 Riven, The Exile&#10;&#10;Champion:&#10;1 Riven, Broken Blade&#10;&#10;MainDeck:&#10;2 Tideturner&#10;..."></textarea>${db.importErr ? `<p class="err">${esc(db.importErr)}</p>` : ''}<div class="btns"><button type="button" class="primary" data-db="doimport">Importar</button><button type="button" data-db="import">Cancelar</button></div></div>` : ''}
    ${db.note ? `<p class="dbnote" role="status">${esc(db.note)}</p>` : ''}
    <div class="decktiles">${decks || '<div class="dbempty mz"><p><b>Você ainda não tem decks.</b></p><p class="muted">Crie um do zero, importe um código ou uma lista, ou copie um starter abaixo para mexer nele.</p></div>'}</div>
    <div class="dbbottom">
      <section class="starters mz"><h2>Starters</h2><p class="muted small">Copie um deck pronto para a sua conta e mexa à vontade.</p><div class="strow">${starters}</div></section>
      <section class="account mz">
        <h2>Conta neste aparelho</h2>
        <div class="arow"><label for="accname">Seu nome</label><input id="accname" value="${esc(p.name)}" maxlength="20"></div>
        ${others.length > 1 ? `<div class="arow"><label for="accswitch">Trocar de conta</label><select id="accswitch">${others.map((o) => `<option value="${o.id}" ${o.id === p.id ? 'selected' : ''}>${esc(o.name)} (${o.decks.length} deck${o.decks.length === 1 ? '' : 's'})</option>`).join('')}</select></div>` : ''}
        <p class="muted small">A conta fica guardada no navegador deste aparelho. Num aparelho compartilhado, crie uma conta para cada pessoa.</p>
        <div class="btns"><button type="button" data-db="newacc">Nova conta</button><button type="button" data-db="backup" aria-expanded="${db.backupOpen}">Backup da conta</button></div>
        ${db.backupOpen ? `<label for="accbackup">Copie este texto para levar a conta para outro aparelho, ou cole aqui um backup para restaurar.</label><textarea id="accbackup" rows="3">${esc(db.backupText)}</textarea><div class="btns"><button type="button" data-db="copybackup">Copiar</button><button type="button" data-db="restore">Restaurar este backup</button></div>` : ''}
      </section>
    </div>
  </section>`;
}

// ───────────────────────────── histórico de partidas ─────────────────────────────
const MODE_PT: Record<hist.HistMode, string> = { ai: 'Contra a IA', human: 'Passa-e-joga', online: 'Online' };
function when(t: number): string {
  const d = new Date(t);
  const two = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const yest = new Date(today.getTime() - 864e5).toDateString() === d.toDateString();
  return `${same ? 'Hoje' : yest ? 'Ontem' : `${two(d.getDate())}/${two(d.getMonth() + 1)}${d.getFullYear() !== today.getFullYear() ? `/${d.getFullYear()}` : ''}`}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}
function histRow(e: hist.HistEntry): string {
  const me = e.seat;
  const other = (1 - me) as 0 | 1;
  const res =
    e.winner === null ? ['draw', 'Fim'] : e.mode === 'human' ? ['hot', `${e.names[e.winner]} venceu`] : e.winner === me ? ['win', 'Vitória'] : ['loss', 'Derrota'];
  const side = (p: 0 | 1) => {
    const dk = e.decks[p];
    const sd = dk.deck?.startsWith('my:') ? acc.getDeck(dk.deck.slice(3)) : null;
    return `<div class="hside${e.winner === p ? ' won' : ''}">${coverArt(dk.legend || null, dk.champion || null, sd?.cover)}<div class="hsn"><b>${esc(e.names[p])}</b><span>${esc(sd?.name ?? dk.name)}</span></div></div>`;
  };
  const can = !!e.replay;
  return `<article class="hrow ${res[0]}" data-h="${e.id}">
    <div class="hmeta"><span class="hres">${esc(res[1])}</span><span class="muted small">${when(e.at)} · ${MODE_PT[e.mode]}</span></div>
    <div class="hmatch">${side(me)}<span class="hvs">${e.points[me]}<i>×</i>${e.points[other]}</span>${side(other)}</div>
    <div class="hinfo small"><span>${e.turns} turnos</span><span>${e.moves} lances</span>${e.elo ? `<span title="Ranking entre amigos">${e.elo.d >= 0 ? '+' : '−'}${Math.abs(e.elo.d)} → ${e.elo.after} pontos</span>` : ''}${e.reason ? `<span class="muted">${esc(e.reason)}</span>` : ''}</div>
    <div class="hacts">${can ? `<button type="button" class="primary" data-db="hopen" data-h="${e.id}" title="Abre o replay; de lá dá para continuar jogando de qualquer lance">Ver replay</button>` : '<span class="muted small" title="Saiu para liberar espaço no aparelho">Replay apagado</span>'}<button type="button" class="link small" data-db="hdel" data-h="${e.id}">Excluir</button></div>
  </article>`;
}
function historyHtml(): string {
  const all = hist.list();
  const list = db.histDeck ? all.filter((e) => e.decks[e.seat].deck === db.histDeck) : all;
  const decksUsed = [...new Set(all.map((e) => e.decks[e.seat].deck).filter((x): x is string => !!x && x.startsWith('my:')))]
    .map((id) => acc.getDeck(id.slice(3)))
    .filter((x): x is acc.SavedDeck => !!x);
  const wins = list.filter((e) => e.mode !== 'human' && e.winner === e.seat).length;
  const counted = list.filter((e) => e.mode !== 'human').length;
  const kb = Math.round(hist.bytes() / 1024);
  const filter = decksUsed.length
    ? `<select id="histdeck" aria-label="Filtrar por deck"><option value="">Todos os decks</option>${decksUsed.map((d) => `<option value="my:${d.id}" ${db.histDeck === `my:${d.id}` ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>`
    : '';
  const clear = all.length
    ? db.histConfirm
      ? `<span class="delask">Apagar todo o histórico?</span><button type="button" class="danger" data-db="hclearyes">Apagar</button><button type="button" data-db="hclearno">Manter</button>`
      : '<button type="button" data-db="hclear">Limpar histórico</button>'
    : '';
  return `<section class="dblist hist">
    <div class="dbhead"><div><h1>Histórico</h1><p class="muted">${all.length ? `${all.length} partida${all.length === 1 ? '' : 's'} guardada${all.length === 1 ? '' : 's'} (as últimas ${hist.MAX_GAMES}) · ${kb} KB neste aparelho` : 'As partidas que você terminar aparecem aqui, com o replay.'}${counted ? ` · ${wins}V ${counted - wins}D${db.histDeck ? ' com este deck' : ''}` : ''}</p></div>
      <div class="btns">${filter}${clear}</div></div>
    ${hist.lastNote ? `<p class="dbnote" role="status">${esc(hist.lastNote)}</p>` : ''}
    ${db.note ? `<p class="dbnote" role="status">${esc(db.note)}</p>` : ''}
    <div class="hlist">${list.map(histRow).join('') || `<div class="dbempty mz"><p><b>${all.length ? 'Nenhuma partida com este deck.' : 'Nenhuma partida terminada ainda.'}</b></p><p class="muted">Cada partida terminada (contra a IA, passa-e-joga ou online) fica guardada com o replay: dá para rever lance a lance e continuar jogando de qualquer ponto.</p></div>`}</div>
  </section>`;
}

// ───────────────────────────── grade da biblioteca (desenha aos poucos) ─────────────────────────────
const CHUNK = 96;
const grid = { sig: '', list: [] as PoolCard[], html: new Map<string, string>() };
const sigOf = (list: PoolCard[]) => list.map((c) => c.code).join(',');
function gridHtml(d: acc.SavedDeck, list: PoolCard[]): string {
  const n = Math.min(list.length, Math.max(db.shown, CHUNK));
  db.shown = n;
  grid.html.clear();
  grid.list = list;
  grid.sig = sigOf(list);
  if (!list.length) return '<p class="muted">Nenhuma carta com esses filtros.</p>';
  const parts = list.slice(0, n).map((c) => {
    const h = tile(d, c);
    grid.html.set(c.code, h);
    return h;
  });
  return parts.join('') + (n < list.length ? '<div class="dbmore" aria-hidden="true"></div>' : '');
}
function countHtml(d: acc.SavedDeck, n: number): string {
  return `<span>${n} carta${n === 1 ? '' : 's'}</span>${anyFilter() ? '<button type="button" class="link small" data-db="clear">Limpar filtros</button>' : ''}<label class="tog"><input type="checkbox" id="dbfit" ${db.fit ? 'checked' : ''} ${d.legend ? '' : 'disabled'}> Só o que cabe na lenda</label><span class="muted hint">Clique põe no deck · botão direito tira</span>`;
}
function tabsHtml(d: acc.SavedDeck): string {
  return `<div class="dbtabs" role="tablist"><button type="button" role="tab" aria-selected="${db.tab === 'cards'}" class="${db.tab === 'cards' ? 'on' : ''}" data-db="tab" data-tab="cards">Biblioteca</button><button type="button" role="tab" aria-selected="${db.tab === 'deck'}" class="${db.tab === 'deck' ? 'on' : ''}" data-db="tab" data-tab="deck">Deck <b>${acc.count(d.main)}/40</b>${acc.validate(d).ok ? '' : ' <i class="todo" aria-label="com pendências"></i>'}</button></div>`;
}
function modalsHtml(d: acc.SavedDeck | null): string {
  return `${zoomHtml(d)}${d && db.modal === 'cover' ? coverHtml(d) : ''}${d && db.modal === 'compare' ? compareHtml(d) : ''}`;
}
let io: IntersectionObserver | null = null;
/** Depois de desenhar: as próximas cartas entram quando o fim da grade chega perto da tela. */
export function mountDb() {
  io?.disconnect();
  io = null;
  const g = document.querySelector('.dbgrid') as HTMLElement | null;
  if (g && db.resetScroll) {
    g.scrollTop = 0;
    db.resetScroll = false;
  }
  const s = g?.querySelector('.dbmore');
  if (!s) return;
  if (typeof IntersectionObserver === 'undefined') {
    while (moreTiles());
    return;
  }
  io = new IntersectionObserver(
    (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      if (moreTiles()) {
        // continua observando a sentinela nova posição (dispara de novo se ainda estiver à vista)
        const s2 = document.querySelector('.dbgrid .dbmore');
        if (s2 && io) {
          io.unobserve(s2);
          io.observe(s2);
        }
      }
    },
    { rootMargin: '900px 0px' },
  );
  io.observe(s);
}
function moreTiles(): boolean {
  const d = cur();
  const g = document.querySelector('.dbgrid');
  const s = g?.querySelector('.dbmore');
  if (!d || !g || !s) return false;
  const from = db.shown;
  const to = Math.min(grid.list.length, from + CHUNK);
  const html = grid.list
    .slice(from, to)
    .map((c) => {
      const h = tile(d, c);
      grid.html.set(c.code, h);
      return h;
    })
    .join('');
  s.insertAdjacentHTML('beforebegin', html);
  db.shown = to;
  if (to >= grid.list.length) {
    s.remove();
    io?.disconnect();
    return false;
  }
  return true;
}
/**
 * Redesenho leve do editor: só as cartas da grade que mudaram (contagens, selos), o painel do deck, as abas e as
 * janelas. A grade inteira só é refeita se a lista filtrada mudar (ex.: trocou a lenda com "só o que cabe").
 */
function lightRender() {
  const d = cur();
  const main = document.querySelector('.deckbuilder.edit');
  if (!d || db.view !== 'edit' || !main) return hooks.render();
  const list = filtered(d);
  const g = main.querySelector('.dbgrid');
  if (g) {
    if (sigOf(list) !== grid.sig) {
      g.innerHTML = gridHtml(d, list);
      mountDb();
    } else {
      for (const c of list.slice(0, db.shown)) {
        const h = tile(d, c);
        if (h === grid.html.get(c.code)) continue;
        const el = g.querySelector(`.dbcard[data-dbcode="${c.code}"]`);
        if (el) el.outerHTML = h;
        grid.html.set(c.code, h);
      }
    }
  }
  const cnt = main.querySelector('.dbcount');
  if (cnt) cnt.innerHTML = countHtml(d, list.length);
  const side = main.querySelector('.dbside') as HTMLElement | null;
  if (side) {
    const st = side.scrollTop;
    side.innerHTML = deckPanel(d);
    side.scrollTop = st;
  }
  const tabs = main.querySelector('.dbtabs');
  if (tabs) tabs.outerHTML = tabsHtml(d);
  const mods = document.getElementById('dbmodals');
  if (mods) mods.innerHTML = modalsHtml(d);
}
/** Só a grade e a contagem (busca enquanto digita: não perde o foco do campo). */
function refreshLib() {
  const d = cur();
  const main = document.querySelector('.deckbuilder.edit');
  const g = main?.querySelector('.dbgrid') as HTMLElement | null;
  if (!d || !main || !g) return hooks.render();
  db.shown = 0;
  const list = filtered(d);
  g.innerHTML = gridHtml(d, list);
  g.scrollTop = 0;
  const cnt = main.querySelector('.dbcount');
  if (cnt) cnt.innerHTML = countHtml(d, list.length);
  const fm = main.querySelector('.fmore');
  if (fm) fm.outerHTML = filtersHtml(d).match(/<button type="button" class="fmore"[^]*?<\/button>/)![0];
  mountDb();
}

export function deckbuilderHtml(): string {
  const d = cur();
  const editing = db.view === 'edit' && !!d;
  const title = editing ? 'Editando deck' : db.view === 'history' ? 'Histórico' : 'Meus decks';
  const head = `<header class="topbar"><div class="brand">Riftbound <span>mesa</span></div><div class="turninfo">${title}</div>
    <div class="tb">${editing || db.view === 'history' ? '<button type="button" data-db="tolist">Meus decks</button>' : ''}<button type="button" data-db="back">Início</button></div></header>`;
  if (db.view === 'history') return `${head}<main class="deckbuilder">${historyHtml()}</main>`;
  if (!editing) return `${head}<main class="deckbuilder">${listHtml()}</main>`;
  const list = filtered(d);
  return `${head}<main class="deckbuilder edit tab-${db.tab}">
    ${tabsHtml(d)}
    <section class="dblib">${filtersHtml(d)}<div class="dbcount">${countHtml(d, list.length)}</div>
      <div class="dbgrid">${gridHtml(d, list)}</div></section>
    <aside class="dbside">${deckPanel(d)}</aside>
    <div id="dbpeek" class="dbpeek" hidden></div>
  </main><div id="dbmodals">${modalsHtml(d)}</div>`;
}

// ───────────────────────────── eventos ─────────────────────────────
function copy(text: string, okMsg: string, title = 'Copiar') {
  copyText(text, title, () => {
    say(okMsg);
    if (db.view === 'edit') lightRender();
    else hooks.render();
  });
}
function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

/** Clique dentro do deckbuilder. Devolve true se tratou. */
export function onDbClick(t: HTMLElement): boolean {
  const root = t.closest('.deckbuilder, #dbmodals, .topbar');
  if (!root) return false;
  const fchip = t.closest('.fchip') as HTMLElement | null;
  if (fchip) {
    if (fchip.dataset.fdom) db.domains = toggle(db.domains, fchip.dataset.fdom as Domain);
    if (fchip.dataset.fcat) db.cats = toggle(db.cats, fchip.dataset.fcat as Cat);
    if (fchip.dataset.fcost) db.costs = toggle(db.costs, Number(fchip.dataset.fcost));
    if (fchip.dataset.fset) db.set = fchip.dataset.fset;
    if (fchip.dataset.fkw) db.kws = toggle(db.kws, fchip.dataset.fkw);
    db.shown = 0;
    db.resetScroll = true;
    hooks.render();
    return true;
  }
  const btn = t.closest('[data-db]') as HTMLElement | null;
  if (!btn) return false;
  const a = btn.dataset.db!;
  const holder = t.closest('[data-dbcode]') as HTMLElement | null;
  const code = holder?.dataset.dbcode ?? db.zoom ?? '';
  const d = cur();
  if (a !== 'copycode' && a !== 'copydeck' && a !== 'copytext' && a !== 'copydecktext' && a !== 'copybackup') db.note = '';
  switch (a) {
    case 'back':
      hooks.back();
      return true;
    case 'closezoom':
      if (t === btn || t.tagName === 'BUTTON') db.zoom = null;
      else return true;
      return lightRender(), true;
    case 'closemodal':
      if (t === btn || t.tagName === 'BUTTON') {
        db.modal = null;
        if (d) acc.saveDeck(d);
      } else return true;
      return lightRender(), true;
    // ── histórico ──
    case 'history':
      db.view = 'history';
      db.histDeck = '';
      db.histConfirm = false;
      hooks.render();
      window.scrollTo(0, 0);
      return true;
    case 'histdeck':
      db.view = 'history';
      db.histDeck = `my:${btn.dataset.deck ?? d?.id ?? ''}`;
      db.histConfirm = false;
      db.zoom = null;
      hooks.render();
      window.scrollTo(0, 0);
      return true;
    case 'hopen': {
      const id = btn.dataset.h!;
      const e = hist.list().find((x) => x.id === id);
      btn.setAttribute('disabled', '');
      void hist.replayOf(id).then((r) => {
        if (r && e) hooks.openReplay(r.cfg, r.answers, e.seat);
        else {
          say('Não deu para abrir o replay desta partida.');
          hooks.render();
        }
      });
      return true;
    }
    case 'hdel':
      hist.remove(btn.dataset.h!);
      break;
    case 'hclear':
      db.histConfirm = true;
      break;
    case 'hclearno':
      db.histConfirm = false;
      break;
    case 'hclearyes':
      hist.clear();
      db.histConfirm = false;
      break;
    // ── capa, comparar, runas, estatísticas ──
    case 'cover':
      db.modal = 'cover';
      return lightRender(), true;
    case 'cvpick':
      if (d && btn.dataset.code) {
        const c = btn.dataset.code;
        d.cover = { code: c, ...coverDefault(c) };
        acc.saveDeck(d);
      }
      return lightRender(), true;
    case 'cvreset':
      if (d) {
        delete d.cover;
        acc.saveDeck(d);
      }
      return lightRender(), true;
    case 'compare':
      db.modal = 'compare';
      db.compareWith = d?.origin && acc.getDeck(d.origin) ? d.origin : '';
      return lightRender(), true;
    case 'cmpdeck': {
      // da lista: abre o editor da cópia já com a comparação
      const dd = acc.getDeck(btn.dataset.deck!);
      if (!dd) break;
      db.deckId = dd.id;
      db.view = 'edit';
      db.sample = [];
      db.runeSug = null;
      db.modal = 'compare';
      db.compareWith = dd.origin ?? '';
      db.shown = 0;
      break;
    }
    case 'musicprev': {
      if (!d?.music || d.music === 'none') return true;
      previewing = previewTrack(d.music);
      break;
    }
    case 'dupedit': {
      if (!d) return true;
      const c = acc.duplicateDeck(d);
      db.deckId = c.id;
      db.sample = [];
      db.runeSug = null;
      say(`Cópia criada: "${c.name}". Mexa à vontade e use "Comparar com a original" para ver o que mudou.`);
      break;
    }
    case 'runesug':
      db.runeSug = d ? suggestRunes(d) : null;
      return lightRender(), true;
    case 'runeclose':
      db.runeSug = null;
      return lightRender(), true;
    case 'runeapply':
      if (d && db.runeSug) {
        d.runes = { ...db.runeSug.runes };
        acc.saveDeck(d);
        say('Runas aplicadas.');
      }
      db.runeSug = null;
      return lightRender(), true;
    case 'statsopen':
      db.statsOpen = !db.statsOpen;
      return lightRender(), true;
    case 'tab':
      db.tab = btn.dataset.tab as any;
      break;
    case 'more':
      db.more = !db.more;
      break;
    case 'fix': {
      // pendência do deck: abre a biblioteca já filtrada no que falta
      const f = btn.dataset.fix;
      db.q = '';
      db.costs = [];
      db.domains = [];
      db.kws = [];
      db.shown = 0;
      db.set = 'all';
      db.rarity = 'all';
      db.cats = f === 'legend' ? ['legend'] : f === 'champion' ? ['champion'] : f === 'bf' ? ['battlefield'] : [];
      if (f === 'champion' && d) db.q = legendTags(d)[0] ?? '';
      db.tab = 'cards';
      db.zoom = null;
      hooks.render();
      document.querySelector('.dbgrid')?.scrollTo(0, 0);
      if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('.dblib')?.scrollIntoView();
      return true;
    }
    case 'clear':
      db.q = '';
      db.domains = [];
      db.cats = [];
      db.kws = [];
      db.shown = 0;
      db.resetScroll = true;
      db.costs = [];
      db.set = 'all';
      db.rarity = 'all';
      break;
    case 'new': {
      const nd = acc.newDeck();
      db.deckId = nd.id;
      db.view = 'edit';
      // deck novo começa pela lenda, sem filtros de uma edição anterior
      db.q = '';
      db.domains = [];
      db.costs = [];
      db.kws = [];
      db.shown = 0;
      db.runeSug = null;
      db.modal = null;
      db.set = 'all';
      db.rarity = 'all';
      db.cats = ['legend'];
      db.tab = 'cards';
      db.sample = [];
      break;
    }
    case 'starter': {
      const sd = acc.fromDeckList(DECKS[Number(btn.dataset.i)], `${DECKS[Number(btn.dataset.i)].name.split(' (')[0]} (meu)`);
      acc.saveDeck(sd);
      db.deckId = sd.id;
      db.view = 'edit';
      db.shown = 0;
      db.runeSug = null;
      db.modal = null;
      break;
    }
    case 'import':
      db.importOpen = !db.importOpen;
      db.importErr = '';
      break;
    case 'doimport': {
      const txt = (document.getElementById('dbimport') as HTMLTextAreaElement | null)?.value ?? '';
      try {
        const { deck, skipped } = acc.deckFromAny(txt);
        acc.saveDeck(deck);
        db.importOpen = false;
        db.deckId = deck.id;
        db.view = 'edit';
        say(skipped.length ? `Importado. Cartas que este jogo ainda não conhece ficaram de fora: ${skipped.join(', ')}.` : 'Deck importado.');
      } catch {
        db.importErr = 'Não consegui ler isso. Confira se copiou o código inteiro, ou se a lista tem uma carta por linha ("2 Tideturner").';
      }
      break;
    }
    case 'edit':
      db.sample = [];
      db.deckId = btn.dataset.deck!;
      db.view = 'edit';
      db.hover = null;
      db.shown = 0;
      db.runeSug = null;
      db.modal = null;
      break;
    case 'tolist':
      db.view = 'list';
      db.zoom = null;
      db.modal = null;
      break;
    case 'dup': {
      const src = acc.getDeck(btn.dataset.deck!);
      if (src) acc.duplicateDeck(src);
      break;
    }
    case 'del':
      db.confirmDelete = btn.dataset.deck!;
      break;
    case 'delno':
      db.confirmDelete = null;
      break;
    case 'delyes':
      acc.deleteDeck(btn.dataset.deck!);
      db.confirmDelete = null;
      break;
    case 'playdeck':
      hooks.play(`my:${btn.dataset.deck}`);
      return true;
    case 'copydecktext': {
      const dd = acc.getDeck(btn.dataset.deck!);
      if (dd) copy(acc.deckText(dd), `Lista de "${dd.name}" copiada.`, `Lista de "${dd.name}"`);
      return true;
    }
    case 'copydeck': {
      const dd = acc.getDeck(btn.dataset.deck!);
      if (dd) copy(acc.deckCode(dd), `Código de "${dd.name}" copiado.`, `Código de "${dd.name}"`);
      return true;
    }
    case 'newacc':
      acc.createProfile('Jogador');
      db.view = 'list';
      say('Conta nova criada. Troque o nome logo abaixo.');
      break;
    case 'backup':
      db.backupOpen = !db.backupOpen;
      db.backupText = acc.exportProfile();
      break;
    case 'copybackup':
      copy(db.backupText, 'Backup copiado.', 'Backup da conta');
      return true;
    case 'restore': {
      const txt = (document.getElementById('accbackup') as HTMLTextAreaElement | null)?.value ?? '';
      try {
        const p = acc.importProfile(txt);
        say(`Conta "${p.name}" restaurada neste aparelho.`);
        db.backupOpen = false;
      } catch {
        say('Esse backup não é válido.');
      }
      break;
    }
    case 'peek':
      if (hooks.touch()) db.zoom = code;
      else db.hover = code;
      return lightRender(), true;
    case 'look':
      // na janela de comparar ou nas estatísticas, só mostra a carta
      if (hooks.touch() || btn.closest('.dbm, .sttab')) db.zoom = code;
      else if (d && code) {
        // no computador, clicar na arte põe no deck
        primary(d, code);
        acc.saveDeck(d);
      }
      return lightRender(), true;
    default:
      if (!d) return true;
      if (a === 'primary') primary(d, code);
      else if (a === 'sub') removeOne(d, code);
      else if (a === 'side') addMain(d, code, true);
      else if (a === 'rsub') removeOne(d, code, (holder?.dataset.zone as any) || 'auto');
      else if (a === 'radd') {
        if (catOf(code) === 'rune') primary(d, code);
        else addMain(d, code, holder?.dataset.zone === 'side');
      } else if (a === 'toside') moveZone(d, code, 'side');
      else if (a === 'tomain') moveZone(d, code, 'main');
      else if (a === 'champ') d.champion = code;
      else if (a === 'xleg') toggleExtraLegend(d, code); // novo (Neeko)
      else if (a === 'split') splitRunes(d);
      else if (a === 'sample' || a === 'nosample') {
        // o campeão escolhido começa fora do deck (zona do campeão)
        const pile: string[] = [];
        for (const [c, n] of Object.entries(d.main)) for (let i = 0; i < n - (c === d.champion ? 1 : 0); i++) pile.push(c);
        for (let i = pile.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pile[i], pile[j]] = [pile[j], pile[i]];
        }
        db.sample = a === 'sample' ? pile.slice(0, 4) : [];
        lightRender();
        return true;
      }
      else if (a === 'copytext') {
        copy(acc.deckText(d), 'Lista do deck copiada.', `Lista de "${d.name}"`);
        return true;
      } else if (a === 'copycode') {
        copy(acc.deckCode(d), 'Código do deck copiado.', `Código de "${d.name}"`);
        return true;
      } else if (a === 'play') {
        hooks.play(`my:${d.id}`);
        return true;
      }
      acc.saveDeck(d);
      // mudanças no deck: só o que mudou na tela
      if (db.view === 'edit') {
        lightRender();
        return true;
      }
  }
  hooks.render();
  return true;
}

/** Campos de texto/seleção do deckbuilder. */
export function onDbInput(t: HTMLElement): boolean {
  const id = t.id;
  const v = (t as HTMLInputElement).value;
  const d = cur();
  if (id === 'dbq') {
    db.q = v;
    refreshLib();
    return true;
  }
  if (id === 'cvy' || id === 'cvx' || id === 'cvz') {
    if (d) coverInput(d, id, Number(v));
    return true;
  }
  if (id === 'dbcmp') {
    db.compareWith = v;
    lightRender();
    return true;
  }
  if (id === 'dbmusic') {
    if (d) {
      d.music = v;
      acc.saveDeck(d);
      // ouvindo a prévia: troca para a nova escolha
      if (previewing) previewing = v !== '' && v !== 'none' && previewTrack(v);
      hooks.render();
    }
    return true;
  }
  if (id === 'histdeck') {
    db.histDeck = v;
    hooks.render();
    return true;
  }
  if (id === 'dbsort' || id === 'dbset' || id === 'dbrar' || id === 'dbfit') {
    db.shown = 0;
    db.resetScroll = true;
  }
  if (id === 'dbsort') db.sort = v as any;
  else if (id === 'dbset') db.set = v;
  else if (id === 'dbrar') db.rarity = v;
  else if (id === 'dbfit') db.fit = (t as HTMLInputElement).checked;
  else if (id === 'dbname' && d) {
    d.name = v.trim().slice(0, 40) || 'Deck sem nome';
    acc.saveDeck(d);
    return true; // sem redesenhar: não perde o foco do campo
  } else if (id === 'accname') {
    acc.renameProfile(v);
    return true;
  } else if (id === 'accswitch') acc.switchProfile(v);
  else return false;
  hooks.render();
  return true;
}

/** Prévia grande ao apontar uma carta (só com mouse). */
export function onDbHover(t: HTMLElement) {
  const pk = document.getElementById('dbpeek');
  if (!pk) return;
  const el = t.closest('.dbcard, .drow, .slotcard, .bfslot, .scard, .rrowb') as HTMLElement | null;
  if (!el || !el.dataset.dbcode || hooks.touch()) {
    pk.hidden = true;
    db.hover = null;
    return;
  }
  const code = el.dataset.dbcode;
  if (code !== db.hover || pk.hidden) pk.innerHTML = peekInner(code);
  db.hover = code;
  pk.hidden = false;
  const r = el.getBoundingClientRect();
  const f = pageZoom(); // tudo em pixels da tela; o style volta para pixels de CSS (zoom.ts)
  const W = pk.offsetWidth * f;
  const H = pk.offsetHeight * f;
  let x = r.right + 12;
  if (x + W > window.innerWidth - 8) x = r.left - W - 12;
  if (x < 8) x = Math.max(8, window.innerWidth - W - 8);
  const y = Math.max(8, Math.min(r.top + r.height / 2 - H / 2, window.innerHeight - H - 8));
  pk.style.left = `${Math.round(x / f)}px`;
  pk.style.top = `${Math.round(y / f)}px`;
}
/** Depois de redesenhar: a prévia volta para a carta que está sob o mouse. */
export function refreshDbPeek() {
  const all = document.querySelectorAll('.deckbuilder :hover');
  const last = all[all.length - 1] as HTMLElement | undefined;
  if (last) onDbHover(last);
}
/** Botão direito numa carta da biblioteca (ou da lista do deck): tira uma. */
export function onDbContext(t: HTMLElement): boolean {
  const el = t.closest('.dbcard .dbimg, .drow, .slotcard, .bfslot') as HTMLElement | null;
  const holder = t.closest('[data-dbcode]') as HTMLElement | null;
  const d = cur();
  if (!el || !holder || !d || db.view !== 'edit') return false;
  removeOne(d, holder.dataset.dbcode!, (holder.dataset.zone as any) || 'auto');
  acc.saveDeck(d);
  db.note = '';
  lightRender();
  return true;
}
