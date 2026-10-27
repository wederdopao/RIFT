import type { CardData } from './types';

// Fichas da regra 187. Não têm custo nem domínio.
function tok(code: string, name: string, type: string, might: number, tags: string[], text: string): CardData {
  return {
    code, name, type, rarity: 'Token', set: 'Token', domains: [], energy: 0, power: 0, might, mightBonus: 0,
    tags, text, effectText: '', errata: false,
  };
}

export const TOKENS: Record<string, CardData> = {
  'TOK-RECRUIT': tok('TOK-RECRUIT', 'Recruit', 'Token Unit', 1, ['Recruit'], ''),
  'TOK-SPRITE': tok('TOK-SPRITE', 'Sprite', 'Token Unit', 3, ['Fae'], '[Temporary]'),
  'TOK-SAND': tok('TOK-SAND', 'Sand Soldier', 'Token Unit', 2, ['Shurima'], ''),
  'TOK-MECH': tok('TOK-MECH', 'Mech', 'Token Unit', 3, ['Mech'], ''),
  'TOK-GOLD': tok('TOK-GOLD', 'Gold', 'Token Gear', 0, [], '[Reaction] Kill this, [Tap]: [Add] [Rune].'),
  'TOK-REFLECTION': tok('TOK-REFLECTION', 'Reflection', 'Token Unit', 0, [], ''),
  'TOK-BIRD': tok('TOK-BIRD', 'Bird', 'Token Unit', 1, ['Bird'], '[Deflect]'),
  'TOK-TENTACLE': tok('TOK-TENTACLE', 'Tentacle', 'Token Unit', 1, ['Bilgewater'], ''),
  // campos sem texto (regra de torneio 602.3.d.1) — usados nos testes
  'TOK-BFA': tok('TOK-BFA', 'Campo Vazio A', 'Battlefield', 0, [], ''),
  'TOK-BFB': tok('TOK-BFB', 'Campo Vazio B', 'Battlefield', 0, [], ''),
  // novo (SFD calm): representa uma habilidade na pilha quando ela é alvo (Not So Fast); nunca vai ao tabuleiro
  'TOK-ABILITY': tok('TOK-ABILITY', 'Habilidade na pilha', 'Ability', 0, [], ''),
  // novo (UNL, lote motor): fichas de campo de batalha (187.8, 187.9); scripts em src/cards/tokens.ts
  'TOK-BRUSH': tok(
    'TOK-BRUSH', 'Brush', 'Token Battlefield', 0, [],
    'Bird, Cat, Dog, Poro, and Ivern units here have +1 [Might]. When you score here, you may replace this with the battlefield it replaced.',
  ),
  'TOK-BARONPIT': tok('TOK-BARONPIT', 'Baron Pit', 'Token Battlefield', 0, [], 'Units can move here from anywhere.'),
  // novo (Radiance): Bomb (gear ficha com Deploy); script em src/cards/tokens.ts
  'TOK-BOMB': tok('TOK-BOMB', 'Bomb', 'Token Gear', 0, [], '[Deploy] When I die, deal 2 to an enemy unit here and kill your other Bombs here.'),
  'TOK-SHADOWCLONE': tok(
    'TOK-SHADOWCLONE', 'Shadow Clone', 'Token Unit', 0, [],
    'When I attack, you may banish a unit from your trash. If you do, give me [Assault 4] this turn.',
  ),
};
