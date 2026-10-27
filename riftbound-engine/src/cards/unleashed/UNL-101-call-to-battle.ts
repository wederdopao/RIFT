import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Loc, Obj, P } from '../../engine/types';

// Mova uma unidade que você controla para um campo de batalha que você controla. Depois, escolha um oponente. Ele move
// uma unidade que ele controla para o mesmo campo.
// - A unidade é alvo; o campo é o destino do movimento, escolhido ao jogar (355.4), e não pode ser o local atual dela
//   (355.4.a; riftboundfaq.com, Call to Battle #same-battlefield-destination). O campo não é alvo (355.10.b).
// - Se a unidade ficou inválida, o spell não faz nada: o segundo movimento é ligado ao primeiro ("o mesmo campo",
//   359.3.e.14.a). Se ela é válida mas não pode se mover (já está lá, movimento impedido), o movimento é negado e o
//   oponente ainda move (359.3.e.14.b; riftboundfaq.com, Movement #failed-move-linked-instructions).
// - A unidade do oponente é escolhida por ele na resolução e não é alvo (355.10.e). O destino é dado pela carta: ele
//   escolhe entre as unidades dele que podem ir para lá (uma que já está lá não se moveria, 355.4.a).
const destsFor = (c: Ctx, u: Obj): number[] =>
  c.g.bfs
    .map((b, i) => i)
    .filter((i) => c.g.bfs[i].controller === c.p && !(u.loc?.t === 'bf' && u.loc.i === i));

registerCard({
  code: 'UNL-101',
  spell: {
    label: 'Call to Battle',
    targets: [
      {
        prompt: 'Call to Battle: mover qual unidade sua?',
        // ao escolher: só unidades com algum campo seu como destino; na resolução o destino já está escolhido
        filter: (c, o) => o.controller === c.p && (c.data[`dest${c.rep}`] !== undefined || destsFor(c, o).length > 0),
      },
    ],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return false;
      const ds = destsFor(c, u);
      if (!ds.length) return false;
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Call to Battle: mover ${g.name(u)} para qual campo seu?`,
        ds.map((i) => ({ id: String(i), label: g.name(g.bfs[i].objId), obj: g.bfs[i].objId })),
      );
      c.data[`dest${c.rep}`] = Number(k);
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const i = c.data[`dest${c.rep}`] as number | undefined;
      if (!u || i === undefined) return;
      const to: Loc = { t: 'bf', i };
      if (u.zone === 'board' && !g.locEq(u.loc, to)) g.moveUnits([u], to, c.p);
      // "escolha um oponente" (1x1: o único) — ele escolhe e move uma unidade dele para o mesmo campo
      const opp = (1 - c.p) as P;
      // a escolha dele tem de permitir o movimento (355.16): fora as que não podem ir para lá e as que ele está proibido
      // de mover (Vex, Apathetic: "ele não pode movê-la neste turno")
      const mine = g.units().filter((x) => x.controller === opp && !g.locEq(x.loc, to) && !g.moveBlocked(x, x.loc!, to) && !g.cantMoveBy(x, opp));
      if (!mine.length) return g.say(`${g.pname(opp)} não tem unidade que possa ir para ${g.name(g.bfs[i].objId)}.`, opp);
      const [pick] = yield* g.chooseObj(opp, `Call to Battle: qual unidade sua vai para ${g.name(g.bfs[i].objId)}?`, mine, 1, 1);
      if (pick) g.moveUnits([pick], to, opp);
    },
  },
});
