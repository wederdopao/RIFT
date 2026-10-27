import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// [Tap]: Buff uma unidade. Se já tem Buff, dê +2 de Might neste turno.
registerCard({
  code: 'RAD-027',
  activated: [
    {
      label: 'Exaurir: Buff (ou +2 de Might se já tem Buff)',
      exhaustSelf: true,
      targets: [T.anyUnit('Iridescent Avian: Buff em qual unidade?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u) return;
        if (u.buffs > 0) c.g.giveMight(u, 2);
        else c.g.buff(u, c.p);
      },
    },
  ],
});
