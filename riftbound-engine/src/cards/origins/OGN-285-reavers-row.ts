import { registerCard } from '../../engine/script';
import { bfIdx, youHere } from '../helpers';
// Campo (BANIDO no padrão): quando você defende aqui, você pode mover uma unidade sua daqui para a base.
registerCard({
  code: 'OGN-285',
  triggers: [
    {
      on: 'defend',
      label: 'Mover uma unidade sua daqui para a base',
      optional: 'Mover uma unidade sua daqui para a base?',
      // "você" = quem controla o campo (regra 190.6.d): sem controlador, não dispara
      cond: (c, ev) => !!ev.playerLevel && ev.bf === bfIdx(c) && youHere(c, ev.player),
      targets: [
        {
          prompt: 'Qual unidade sua volta para a base?',
          filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) === bfIdx(c),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
