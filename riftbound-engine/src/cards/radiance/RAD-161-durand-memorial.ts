import { registerCard } from '../../engine/script';
import { bfIdx, youHere } from '../helpers';
// RAD-161 Durand Memorial — "When you defend here, choose a unit you control here. Give it [Tank] this combat."
// "Choose" é alvo escolhido quando o gatilho vai para a pilha (355.5; como Fortified Position, FAQ riftjudge #5071), não
// na resolução. "You" = quem controla o campo (190.6.d).
registerCard({
  code: 'RAD-161',
  triggers: [
    {
      on: 'defend',
      label: 'Dar Tank a uma unidade sua aqui neste combate',
      cond: (c, ev) => !!ev.playerLevel && ev.bf === bfIdx(c) && youHere(c, ev.player),
      targets: [
        {
          prompt: 'Durand Memorial: dar Tank neste combate a qual unidade sua aqui?',
          filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) === bfIdx(c),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveKw(u, { tank: true }, 'combat');
      },
    },
  ],
});
