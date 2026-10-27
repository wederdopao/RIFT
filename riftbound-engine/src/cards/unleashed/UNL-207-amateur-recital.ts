import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura (hold) aqui, você pode mover uma unidade num campo para a base dela.
// "Você pode" no começo: o jogador decide se o gatilho vai para a pilha. A unidade (qualquer uma, em qualquer campo) é alvo,
// escolhida ao finalizar; "a base dela" = a base de quem a controla. Mover não é recall (não exaure).
registerCard({
  code: 'UNL-207',
  triggers: [
    {
      on: 'hold',
      label: 'Mover uma unidade num campo para a base',
      optional: 'mover uma unidade num campo para a base dela?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p && c.g.units().some((u) => c.g.bfIndex(u) >= 0),
      targets: [{ prompt: 'Amateur Recital: mover qual unidade num campo para a base dela?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
