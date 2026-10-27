import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Pyke, Dockside Butcher. Hidden, Ganking. Você pode pagar [Fury] como custo adicional para me jogar. Quando você me joga,
// se pagou o custo adicional, me prepare e me dê +2 de Might neste turno.
// - Jogado de face para baixo, o custo base é ignorado mas o custo adicional opcional ainda pode ser pago (RiftJudge
//   #10539; riftboundfaq.com/mechanics/hidden#face-down-costs). Ezreal, Prodigy pode reduzi-lo a 0 (RiftJudge #11230).
// - "Se pagou" faz parte da condição do gatilho (383.2.a.1).
registerCard({
  code: 'UNL-028',
  keywords: { hidden: true, ganking: true },
  optionalCosts: [{ label: 'Pagar [Fury] a mais para entrar pronto e com +2 de Might neste turno?', cost: E(0, 'Fury'), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Me preparar e +2 de Might neste turno (custo adicional pago)',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self, c.p);
        c.g.giveMight(c.self, 2);
      },
    },
  ],
});
