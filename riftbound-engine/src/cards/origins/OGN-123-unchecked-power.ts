import { registerCard } from '../../engine/script';

// Exaura todas as unidades aliadas, depois cause 12 de dano a todas as unidades nos campos de batalha.
registerCard({
  code: 'OGN-123',
  spell: {
    label: 'Unchecked Power',
    resolve: function* (c) {
      const g = c.g;
      for (const u of g.units().filter((o) => o.controller === c.p)) g.exhaust(u);
      for (const u of g.units().filter((o) => g.bfIndex(o) >= 0)) g.dealDamage(u, 12, c.self);
    },
  },
});
