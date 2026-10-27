import { registerCard } from '../../engine/script';

// Quando eu ataco, ganho +2 de Might neste turno se houver uma unidade inimiga pronta aqui.
registerCard({
  code: 'OGN-131',
  triggers: [
    {
      on: 'attack',
      label: '+2 de Might se houver unidade inimiga pronta aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const i = g.bfIndex(c.self);
        if (c.self.zone !== 'board' || i < 0) return;
        if (g.unitsAtBf(i).some((u) => u.controller !== c.p && !u.exhausted)) g.giveMight(c.self, 2);
        else g.say('Dune Drake: nenhuma unidade inimiga pronta aqui.');
      },
    },
  ],
});
