import { registerCard } from '../../engine/script';

// Quando eu ataco, cause 3 de dano a todas as unidades inimigas aqui.
registerCard({
  code: 'OGN-148',
  triggers: [
    {
      on: 'attack',
      label: '3 de dano em todas as unidades inimigas aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const i = c.g.bfIndex(c.self);
        if (c.self.zone !== 'board' || i < 0) return;
        for (const u of c.g.unitsAtBf(i).filter((x) => x.controller !== c.p)) c.g.dealDamage(u, 3, c.self);
      },
    },
  ],
});
