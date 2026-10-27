import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { banishTopPlayable } from './_rad';

// Ao jogar isto ou quando sair do tabuleiro, bana o topo do deck e pode jogá-lo até o próximo Ending Phase.
// [2][Chaos], [Tap]: mate isto.
registerCard({
  code: 'RAD-012',
  triggers: [
    {
      on: 'play',
      label: 'Banir o topo do deck (pode jogá-lo)',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        banishTopPlayable(c);
      },
    },
    {
      on: 'leave',
      zone: 'self',
      label: 'Banir o topo do deck (pode jogá-lo)',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        banishTopPlayable(c);
      },
    },
  ],
  activated: [
    {
      label: 'Matar isto',
      cost: E(2, 'Chaos'),
      exhaustSelf: true,
      resolve: function* (c) {
        if (c.self.zone === 'board') yield* c.g.killG(c.self);
      },
    },
  ],
});
