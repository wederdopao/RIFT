import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-146 Siphoning Strike
registerCard({
  code: 'VEN-146',
  spell: {
    label: 'Siphoning Strike',
    targets: [{ prompt: 'Siphoning Strike: qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const n = g.runesOf(c.p).length >= 7 ? 7 : 4;
      const uid = u.id;
      const ver = u.zoneVersion;
      g.dealDamage(u, n, c.self);
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'die',
        once: true,
        untilTurn: g.turn,
        cond: (cc, ev) => ev.obj?.id === uid && cc.g.objs[uid].zoneVersion >= ver,
        ability: {
          label: 'Canalizar 1 runa exausta',
          resolve: function* (cc) {
            cc.g.channel(cc.p, 1, true);
          },
        },
      });
    },
  },
});
