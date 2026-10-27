import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando uma unidade sai daqui (movimento), dê +1 de Might a ela neste turno.
registerCard({
  code: 'OGN-277',
  triggers: [
    {
      on: 'move',
      label: '+1 de Might para a unidade que saiu daqui',
      cond: (c, ev) => !!ev.unit && ev.from?.t === 'bf' && ev.from.i === bfIdx(c),
      resolve: function* (c) {
        const u = c.ev!.unit;
        if (u.zone === 'board') c.g.giveMight(u, 1);
      },
    },
  ],
});
