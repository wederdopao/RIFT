import { registerCard } from '../../engine/script';

// Inviolus Vox. Quando eu conquisto, dê +8 de Might a uma unidade aliada neste turno (qualquer uma, eu inclusive).
registerCard({
  code: 'UNL-027',
  triggers: [
    {
      on: 'conquer',
      label: '+8 de Might numa unidade aliada neste turno',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      targets: [{ prompt: 'Inviolus Vox: dar +8 de Might a qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 8);
      },
    },
  ],
});
