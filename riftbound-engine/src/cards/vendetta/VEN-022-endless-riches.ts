import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';

// Endless Riches — "When you play this, banish your hand and trash, then [Burn 7]. Skip your draw phase. You may play
// cards from your trash. If a card would go to your trash from anywhere other than your Main Deck, banish it instead."
// Ganchos genéricos: Aura.skipPhase, Aura.playFromTrash (custo normal, timing normal) e Aura.trashReplace.
const mine = (src: Obj, p: P) => src.zone === 'board' && src.controller === p;
registerCard({
  code: 'VEN-022',
  onPlay: [
    {
      label: 'Banir mão e descarte, Burn 7',
      resolve: function* (c) {
        const g = c.g;
        for (const id of [...g.pl[c.p].hand, ...g.pl[c.p].trash]) g.banishObj(g.objs[id]);
        g.burn(c.p, 7);
      },
    },
  ],
  auras: [
    {
      skipPhase: (_g: Engine, src, p, phase) => phase === 'draw' && mine(src, p),
      playFromTrash: (_g, src, card, p) => mine(src, p) && card.owner === p,
      trashReplace: (_g, src, card, from) => (src.zone === 'board' && card.owner === src.controller && from !== 'mainDeck' ? 'banish' : undefined),
    },
  ],
});
