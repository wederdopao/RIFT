import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Action. Escolha um gear aliado. Cause dano igual ao custo de Energia dele a uma unidade num campo.
registerCard({
  code: 'RAD-056',
  keywords: { action: true },
  spell: {
    label: 'Improvised Projectile',
    targets: [
      { prompt: 'Improvised Projectile: qual gear seu?', kind: 'gear', filter: (c, o) => o.controller === c.p },
      T.unitAtBf('Improvised Projectile: dano em qual unidade num campo?'),
    ],
    resolve: function* (c) {
      const gear = c.targets[0]?.[0];
      const u = c.targets[1]?.[0];
      if (!gear || !u) return;
      const n = c.g.data(gear).energy;
      if (n > 0) c.g.dealDamage(u, n, c.self);
    },
  },
});
