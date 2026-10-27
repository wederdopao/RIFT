import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Você pode pagar [Mind] como custo adicional para me jogar.
// Quando você me joga, se pagou o custo adicional, dê -2 de Might a uma unidade neste turno.
// O "se pagou" faz parte da condição do gatilho (regra 383.2.a.1).
registerCard({
  code: 'SFD-067',
  optionalCosts: [{ label: 'Pagar [Mind] a mais para dar -2 de Might a uma unidade?', cost: E(0, 'Mind'), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Dar -2 de Might a uma unidade (custo adicional pago)',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [{ prompt: 'Frostcoat Cub: dar -2 de Might a qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -2);
      },
    },
  ],
});
