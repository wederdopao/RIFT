import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// VEN-157 Dragon Roost — "Any player may pay [Rune][Rune] as an additional cost to play a Dragon. If they do, they play
// it to this battlefield." Custo adicional de local (Aura.locCost): ao jogar um Dragon, este campo vira opção de local
// pagando [Rune][Rune] a mais (quando ele não seria local permitido de outro jeito).
registerCard({
  code: 'VEN-157',
  auras: [
    {
      locCost: (g, src, unit) => (g.hasTag(unit, 'Dragon') && g.bfOf(src) >= 0 ? { i: g.bfOf(src), cost: E(0, 'any', 'any') } : undefined),
    },
  ],
});
