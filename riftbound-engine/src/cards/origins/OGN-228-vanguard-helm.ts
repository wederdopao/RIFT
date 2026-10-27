import { registerCard } from '../../engine/script';

// Quando uma unidade aliada com Buff morre, dê Buff a outra unidade aliada.
registerCard({
  code: 'OGN-228',
  triggers: [
    {
      on: 'die',
      label: 'Buff em outra unidade aliada',
      cond: (c, ev) => !!ev.obj && ev.controller === c.p && !!ev.wasBuffed && c.g.isUnit(ev.obj),
      targets: [{ prompt: 'Vanguard Helm: Buff em qual unidade sua?', filter: (c, o) => o.controller === c.p && o.id !== c.ev?.obj?.id }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
