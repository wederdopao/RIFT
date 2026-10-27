import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Assault 3. Se um oponente controla um campo, entro pronta.
// Quando eu conquisto, você pode pagar [1] para me devolver à mão do meu dono.
registerCard({
  code: 'OGN-035',
  keywords: { assault: 3 },
  entersReady: (g, self) => g.bfs.some((b) => b.controller !== null && b.controller !== self.controller),
  triggers: [
    {
      on: 'conquer',
      label: 'Pagar 1 para voltar para a mão',
      optional: 'Pagar 1 para devolver Vayne à mão?',
      cost: E(1),
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.returnToHand(c.self);
      },
    },
  ],
});
