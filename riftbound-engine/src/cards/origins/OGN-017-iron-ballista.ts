import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Gear: entra exaurido. [Tap]: cause 2 a uma unidade num campo.
registerCard({
  code: 'OGN-017',
  entersReady: () => false,
  activated: [
    {
      label: 'Exaurir: 2 de dano numa unidade num campo',
      exhaustSelf: true,
      targets: [{ prompt: 'Iron Ballista: 2 de dano em qual unidade num campo?', filter: (c, o) => atBf(c, o) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 2, c.self);
      },
    },
  ],
});
