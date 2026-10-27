import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Você pode exaurir sua lenda como custo adicional para me jogar.
// Quando você me joga, se pagou o custo adicional, mova qualquer número de unidades suas para um campo aberto.
// - O "se pagou" faz parte da condição do gatilho (383.2.a.1).
// - As unidades são alvos (zona pública, 355.10) escolhidos ao pôr o gatilho na pilha, inclusive zero (355.13); o campo
//   de destino também é escolhido nessa hora (355.4) e não é alvo (355.10.b). Campo aberto: sem unidades e sem
//   controlador (170.11.c).
// - Unidade que "não pode se mover neste turno" (Vex, Apathetic) não pode ser movida, nem por esta habilidade (FAQ
//   riftjudge #10548).
const canMove = (turn: number, noMove?: number) => noMove !== turn;
registerCard({
  code: 'SFD-079',
  optionalCosts: [
    {
      label: 'Exaurir sua lenda como custo adicional (para mover unidades para um campo aberto)?',
      flag: 'paid',
      canPay: (g, self, p) => g.legendsOf(p).some((l) => !l.exhausted),
      pay: function* (c) {
        const ls = c.g.legendsOf(c.p).filter((l) => !l.exhausted); // com Neeko pode haver mais de uma lenda
        const leg = ls.length > 1 ? (yield* c.g.chooseObj(c.p, 'Exaurir qual lenda?', ls))[0] : ls[0];
        if (!leg || leg.exhausted) return false;
        leg.exhausted = true;
        c.g.say(`${c.g.pname(c.p)} exaure a lenda ${c.g.name(leg)}.`, c.p);
        return true;
      },
    },
  ],
  triggers: [
    {
      on: 'play',
      label: 'Mover unidades suas para um campo aberto',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [
        {
          prompt: 'Bard: mover quais unidades suas para um campo aberto? (qualquer número)',
          min: 0,
          max: 99,
          filter: (c, o) => o.controller === c.p && canMove(c.g.turn, o.noMoveTurn),
        },
      ],
      choose: function* (c, ids) {
        const g = c.g;
        if (!ids[0]?.length) return true;
        const open = g.bfs.map((_, i) => i).filter((i) => g.isOpenBf(i));
        if (!open.length) return true; // nenhum campo aberto: não há para onde mover
        const [k] = yield* g.ask(
          c.p,
          'choose',
          'Bard: para qual campo aberto?',
          open.map((i) => ({ id: String(i), label: g.name(g.bfs[i].objId), obj: g.bfs[i].objId })),
        );
        c.data.dest = { t: 'bf', i: Number(k) } as Loc;
        return true;
      },
      resolve: function* (c) {
        const to = c.data.dest as Loc | undefined;
        if (!to) return;
        const us = c.targets[0].filter((u) => u.zone === 'board' && canMove(c.g.turn, u.noMoveTurn));
        if (us.length) yield* c.g.moveUnitsG(us, to, c.p); // revisão UNL order: custo aplicado (204.4.c)
      },
    },
  ],
});
