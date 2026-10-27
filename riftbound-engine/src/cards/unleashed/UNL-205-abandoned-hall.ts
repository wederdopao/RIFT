import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando um jogador joga um spell, ele pode dar +1 de Might neste turno a uma unidade que ele controla aqui.
// - Quem jogou o spell faz as escolhas, então ele controla a habilidade, controle o campo quem controlar (190.6.c; FAQ
//   oficial do Unleashed, Abandoned Hall). Dispara quando a jogada termina (419.4.a); spell anulado não conta.
// - "Pode" no começo do efeito: ele decide se vai para a pilha. A unidade é alvo, escolhida ao finalizar.
registerCard({
  code: 'UNL-205',
  triggers: [
    {
      on: 'play',
      label: '+1 de Might neste turno a uma unidade sua aqui',
      optional: 'dar +1 de Might neste turno a uma unidade sua neste campo?',
      controller: (_g, _src, ev) => (ev.spell && ev.player !== undefined ? ev.player : null),
      cond: (c, ev) => !!ev.spell && ev.player === c.p && c.g.unitsAtBf(bfIdx(c), c.p).length > 0,
      targets: [{ prompt: 'Abandoned Hall: +1 de Might em qual unidade sua aqui?', filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) === bfIdx(c) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 1);
      },
    },
  ],
});
