import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Mel, Newly Awakened — "When you play me, draw 1. [Empower][3]. [Empowered] Your spells and abilities can't be
// countered. If a spell or ability you control would give -[Might] to a unit it chooses, it gives an additional -1[Might]."
// Aura.uncounterable e Aura.mightGiveMod (uma unidade que o spell/habilidade escolheu: Engine.itemChose).
registerCard({
  code: 'VEN-069',
  empower: E(3),
  onPlay: [
    {
      label: 'Comprar 1',
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
  auras: [
    {
      uncounterable: (_g, src, item) => src.zone === 'board' && src.empowered && item.controller === src.controller,
      mightGiveMod: (g, src, unit, n, item, by) =>
        n < 0 && src.zone === 'board' && src.empowered && by === src.controller && !!item && item.controller === src.controller && g.itemChose(item, unit) ? -1 : 0,
    },
  ],
});
