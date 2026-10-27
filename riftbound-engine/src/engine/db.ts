import type { CardData, Kind } from './types';
import cardsJson from '../data/cards.json';
import { TOKENS } from './tokens';

const DB: Record<string, CardData> = cardsJson as any;

/**
 * Novo (online com informação oculta): código de mentira das cartas que quem está olhando não pode ver (mão e deck do
 * oponente, cartas viradas dele). Só aparece nas visões filtradas (src/engine/view.ts); nunca numa partida de verdade.
 */
export const HIDDEN_CODE = '??';
const HIDDEN_DATA: CardData = {
  code: HIDDEN_CODE,
  name: 'Carta escondida',
  type: 'Hidden',
  rarity: '',
  set: '',
  domains: [],
  energy: 0,
  power: 0,
  might: 0,
  mightBonus: 0,
  tags: [],
  text: '',
  effectText: '',
  errata: false,
};

export function cardData(code: string): CardData {
  if (code === HIDDEN_CODE) return HIDDEN_DATA;
  const t = TOKENS[code];
  if (t) return t;
  const c = DB[code];
  if (!c) throw new Error(`Carta desconhecida: ${code}`);
  return c;
}

export function hasCard(code: string): boolean {
  return !!(TOKENS[code] || DB[code]);
}

export function allCards(): CardData[] {
  return Object.values(DB);
}

export function kindOf(code: string): Kind {
  const t = cardData(code).type.toLowerCase();
  if (t.includes('legend')) return 'legend';
  if (t.includes('battlefield')) return 'battlefield';
  if (t.includes('rune')) return 'rune';
  if (t.includes('spell')) return 'spell';
  if (t.includes('unit gear')) return 'gear';
  if (t.includes('unit')) return 'unit';
  if (t.includes('gear')) return 'gear';
  return 'unit';
}

export function isChampionCard(code: string): boolean {
  return cardData(code).type.toLowerCase().includes('champion');
}

export function isSignature(code: string): boolean {
  return cardData(code).type.toLowerCase().includes('signature');
}
