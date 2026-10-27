import { registerCard } from '../../engine/script';

// Quando eu me movo para um campo de batalha, dê +1 de Might a outra unidade aliada neste turno (qualquer local).
registerCard({
  code: 'SFD-038',
  triggers: [
    {
      on: 'move',
      label: '+1 de Might em outra unidade aliada',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      targets: [{ prompt: 'Ribbon Dancer: +1 de Might em qual outra unidade sua?', filter: (c, o) => o.controller === c.p && o.id !== c.self.id }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 1);
      },
    },
  ],
});
