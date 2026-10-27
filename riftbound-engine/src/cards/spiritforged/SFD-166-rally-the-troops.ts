import { registerCard } from '../../engine/script';

// Action. Quando uma unidade aliada for jogada neste turno, dê um Buff a ela. Compre 1.
// Vale para todas as unidades aliadas jogadas no resto do turno, inclusive fichas de unidade (RiftJudge #600, #10520,
// #11350): é um gatilho atrasado que dispara a cada jogada. Unidade que já tem Buff não ganha outro (regra 427.1.b.1).
registerCard({
  code: 'SFD-166',
  keywords: { action: true },
  spell: {
    label: 'Rally the Troops',
    resolve: function* (c) {
      const g = c.g;
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'play',
        once: false,
        untilTurn: g.turn,
        cond: (cc, ev) => !!ev.obj && !ev.spell && cc.g.isUnit(ev.obj) && ev.obj.controller === cc.p,
        ability: {
          label: 'Rally the Troops: Buff na unidade jogada',
          resolve: function* (cc) {
            const u = cc.ev!.obj;
            if (u.zone === 'board') cc.g.buff(u, cc.p);
          },
        },
      });
      g.say(`${g.pname(c.p)}: as unidades aliadas jogadas neste turno recebem um Buff (Rally the Troops).`, c.p);
      yield* g.draw(c.p, 1);
    },
  },
});
