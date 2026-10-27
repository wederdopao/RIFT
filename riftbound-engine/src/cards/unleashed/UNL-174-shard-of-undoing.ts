import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';

// A primeira vez que uma unidade aliada morre durante a sua Beginning Phase em cada turno, cada oponente tem de matar
// uma das unidades dele.
// - "A primeira vez": mortes simultâneas (mesmo killG) contam como uma vez só e o gatilho dispara uma vez (383.1.b);
//   cada Shard dispara por conta própria (RiftJudge #10219, #10504).
// - Não é alvo: o oponente escolhe na resolução uma unidade dele em qualquer local.
registerCard({
  code: 'UNL-174',
  triggers: [
    {
      on: 'die',
      label: 'Cada oponente mata uma das unidades dele',
      cond: (c, ev) => {
        const g = c.g;
        if (g.phase !== 'beginning' || g.active !== c.p) return false;
        if (ev.controller !== c.p || !ev.obj || !g.isUnit(ev.obj)) return false;
        const d = (c.self.data ||= {});
        if (d.shardTurn === g.turn) return false; // já houve a primeira vez neste turno
        d.shardTurn = g.turn;
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const op = opp(c.p);
        const us = g.units().filter((u) => u.controller === op);
        if (!us.length) return;
        const [u] = yield* g.chooseObj(op, 'Shard of Undoing: qual unidade sua vai morrer?', us);
        if (u) yield* g.killG(u);
      },
    },
  ],
});
