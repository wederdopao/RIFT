import { registerCard } from '../../engine/script';

// Disarm. Quando você reduz o Might de uma unidade inimiga aqui em 1 ou mais, me dê +1 de Might neste turno.
registerCard({
  code: 'RAD-038',
  keywords: { disarm: 1 },
  triggers: [
    {
      on: 'mightReduce',
      label: '+1 de Might neste turno',
      cond: (c, ev) => {
        const i = c.g.bfIndex(c.self);
        return i >= 0 && ev.by === c.p && ev.unit?.controller !== c.p && c.g.bfIndex(ev.unit) === i;
      },
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 1);
      },
    },
  ],
});
