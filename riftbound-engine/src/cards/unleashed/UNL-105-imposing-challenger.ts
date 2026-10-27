import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Quando eu me movo, você pode mover uma unidade inimiga aqui com menos Might que eu para um campo de batalha diferente.
// - "Você pode" no início: decidido ao pôr o gatilho na pilha (383.3.a); a unidade é alvo escolhido nessa hora e o campo
//   de destino também (355.4), diferente do local dela (355.4.a). Qualquer movimento meu dispara (para a base também).
// - "Aqui" e o meu Might são conferidos na resolução (359.3.f.1-2): se a unidade não está mais comigo, ou não tem menos
//   Might que eu, ou eu saí do tabuleiro, ela não é afetada (359.3.e.2, 359.3.e.12).
const here = (c: Ctx, o: Obj) =>
  c.self.zone === 'board' && !!c.self.loc && c.g.locEq(o.loc, c.self.loc) && c.g.might(o) < c.g.might(c.self);

registerCard({
  code: 'UNL-105',
  triggers: [
    {
      on: 'move',
      label: 'Mover uma unidade inimiga aqui com menos Might para outro campo',
      optional: 'Mover uma unidade inimiga aqui com menos Might que eu para um campo de batalha diferente?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Imposing Challenger: mover qual unidade inimiga aqui (com menos Might)?',
          filter: (c, o) => o.controller !== c.p && here(c, o) && c.g.bfs.some((_, i) => !(o.loc?.t === 'bf' && o.loc.i === i)),
        },
      ],
      choose: function* (c, ids) {
        const g = c.g;
        const u = g.objs[ids[0]?.[0]];
        if (!u) return false;
        const ds = g.bfs.map((_, i) => i).filter((i) => !(u.loc?.t === 'bf' && u.loc.i === i));
        if (!ds.length) return false;
        const [k] = yield* g.ask(
          c.p,
          'choose',
          `Imposing Challenger: mover ${g.name(u)} para qual campo?`,
          ds.map((i) => ({ id: String(i), label: g.name(g.bfs[i].objId), obj: g.bfs[i].objId })),
        );
        c.data.dest = Number(k);
        return true;
      },
      resolve: function* (c) {
        const u = c.targets[0][0];
        const i = c.data.dest as number | undefined;
        if (!u || i === undefined) return;
        const to = { t: 'bf' as const, i };
        if (!c.g.locEq(u.loc, to)) c.g.moveUnits([u], to, c.p);
      },
    },
  ],
});
