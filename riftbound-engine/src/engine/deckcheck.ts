// Validação de deck (regra 103) + lista de banidas.
import { allCards, cardData, isChampionCard, isSignature, kindOf } from './db';
import { BANNED_STANDARD } from '../data/banlist';
import type { DeckList } from './engine';

export interface DeckReport {
  errors: string[]; // impedem jogar
  banned: string[]; // nomes das banidas no padrão
}

export function checkDeck(d: DeckList): DeckReport {
  const errors: string[] = [];
  const legend = cardData(d.legend);
  if (kindOf(d.legend) !== 'legend') errors.push('A lenda não é uma carta de lenda.');
  const ident = new Set(legend.domains);
  const champ = cardData(d.champion);
  if (!isChampionCard(d.champion)) errors.push('A campeã escolhida não é uma unidade campeã.');
  if (!champ.tags.some((t) => legend.tags.includes(t))) errors.push('A campeã escolhida não tem a tag da lenda.');
  const counts: Record<string, number> = { [d.champion]: 1 };
  for (const [c, n] of d.main) counts[c] = (counts[c] || 0) + n;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total < 40) errors.push(`O deck principal tem ${total} cartas (mínimo 40).`);
  let sig = 0;
  for (const [c, n] of Object.entries(counts)) {
    const cd = cardData(c);
    if (n > 3 && cd.name !== 'Spiderling') errors.push(`${cd.name}: ${n} cópias (máximo 3).`);
    if (cd.domains.some((x) => !ident.has(x))) errors.push(`${cd.name} está fora da identidade de domínio.`);
    // Signature (inclui Signature Gear e Signature Spell): no máximo 3 no total (103.2.d.1), todas com a tag de
    // campeão da lenda (103.2.d.2; Signature + Unique: 825.3.b)
    if (isSignature(c)) {
      sig += n;
      if (!cd.tags.some((t) => legend.tags.includes(t))) errors.push(`${cd.name} é Signature de outro campeão (precisa da tag da lenda).`);
    }
    if (/\[Unique\]/i.test(cd.text) && n > 1) errors.push(`${cd.name} é Unique (máximo 1).`);
  }
  if (sig > 3) errors.push(`${sig} cartas Signature (máximo 3).`);
  const runes = d.runes.reduce((s, [, n]) => s + n, 0);
  if (runes !== 12) errors.push(`${runes} runas (precisa de 12).`);
  if (d.battlefields.length !== 3) errors.push(`${d.battlefields.length} campos (precisa de 3).`);
  errors.push(...extraLegendErrors(d, Object.keys(counts)));
  const banned = [...Object.keys(counts), ...d.battlefields, ...(d.extraLegends || [])]
    .filter((c) => BANNED_STANDARD[c])
    .map((c) => cardData(c).name);
  return { errors, banned: [...new Set(banned)] };
}

// ── Novo (RAD-167 Neeko, Blending In): "If Neeko is in your deck, choose up to 3 different legends in addition to your starting
// legend. (Different means none match names.)" ──
/** Cartas que pedem lendas extras na montagem do deck, e quantas. */
export const EXTRA_LEGEND_CARDS: Record<string, number> = { 'RAD-167': 3 };
/** Quantas lendas extras o deck precisa escolher (0 = nenhuma). `codes` = cartas do deck (principal + campeã). */
export function needsExtraLegends(codes: string[]): number {
  let n = 0;
  for (const c of codes) n = Math.max(n, EXTRA_LEGEND_CARDS[c] || 0);
  return n;
}
function extraLegendErrors(d: DeckList, codes: string[]): string[] {
  const need = needsExtraLegends(codes);
  const ex = d.extraLegends || [];
  if (!need) return ex.length ? ['Lendas extras só valem com Neeko, Blending In no deck.'] : [];
  const errs: string[] = [];
  // errata de 09/10/2026: "choose up to 3 different legends" (Radiance Errata Updates): de 0 a 3
  if (ex.length > need) errs.push(`Neeko, Blending In: escolha até ${need} lendas além da inicial (há ${ex.length}).`);
  if (ex.some((c) => kindOf(c) !== 'legend')) errs.push('Neeko, Blending In: as escolhas precisam ser lendas.');
  const names = [cardData(d.legend).name, ...ex.map((c) => cardData(c).name)];
  if (new Set(names).size !== names.length) errs.push('Neeko, Blending In: as lendas precisam ter nomes diferentes (entre si e da lenda inicial).');
  return errs;
}
/** Lendas que podem ser escolhidas como extras (nomes diferentes da inicial e das já escolhidas). */
export function extraLegendChoices(d: { legend: string | null; extraLegends?: string[] }): string[] {
  const used = new Set([d.legend, ...(d.extraLegends || [])].filter(Boolean).map((c) => cardData(c!).name));
  const seen = new Set<string>();
  return allCards()
    .filter((c) => /^(OGN|OGS|SFD|UNL|VEN|RAD)-\d{3}$/.test(c.code) && kindOf(c.code) === 'legend' && !used.has(c.name))
    .filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)))
    .map((c) => c.code);
}
/** Completa (ou corta) as lendas extras de um deck montado automaticamente (IA, fuzz). `pick(n)` = inteiro em [0, n). */
export function fillExtraLegends(d: DeckList, pick: (n: number) => number): DeckList {
  const need = needsExtraLegends([d.champion, ...d.main.map(([c]) => c)]);
  const ex = (d.extraLegends || []).slice(0, need);
  while (ex.length < need) {
    const opts = extraLegendChoices({ legend: d.legend, extraLegends: ex });
    if (!opts.length) break;
    ex.push(opts[pick(opts.length)]);
  }
  return { ...d, extraLegends: need ? ex : undefined };
}
