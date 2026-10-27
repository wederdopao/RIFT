import { registerCard } from '../../engine/script';

// As próximas três vezes que você joga uma unidade neste turno, compre 1.
registerCard({
  code: 'RAD-047',
  spell: {
    label: 'Fanfare',
    resolve: function* (c) {
      const g = c.g;
      const spell = c.self;
      spell.data = { ...(spell.data || {}), fanfare: 0 };
      g.addDelayed({
        controller: c.p,
        sourceId: spell.id,
        on: 'play',
        once: false,
        untilTurn: g.turn,
        cond: (cc, ev) => {
          if (ev.player !== cc.p || !ev.obj || !cc.g.isUnit(ev.obj)) return false;
          const s = cc.g.objs[spell.id];
          const n = (s.data?.fanfare || 0) + 1;
          if (n > 3) return false;
          s.data = { ...(s.data || {}), fanfare: n };
          return true;
        },
        ability: {
          label: 'Fanfare: comprar 1',
          resolve: function* (cc) {
            yield* cc.g.draw(cc.p, 1);
          },
        },
      });
    },
  },
});
