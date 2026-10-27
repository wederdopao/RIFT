import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// [Hidden]. [Action]. Mova qualquer número de unidades aliadas que estão num campo de batalha para a base delas.
// Um campo só (RiftJudge FAQ #10641): o campo é restrição de alvo, não alvo (regra 355.10.b); as unidades são alvos e
// podem ser zero (regra 355.13). Escondida, só o campo onde estava (811.1.d.2).
// O campo é guardado por execução (c.rep): com [Repeat] dado por efeito (Syndra, Transcendent; Temporal Portal) cada
// execução faz a própria escolha (820.2.a) e a 2ª não pode apagar a da 1ª.
const key = (c: Ctx) => `bf${c.rep}`;
const okUnit = (c: Ctx, o: Obj) => o.controller === c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.data[key(c)];
registerCard({
  code: 'SFD-043',
  keywords: { hidden: true, action: true },
  spell: {
    label: "Emperor's Divide",
    prepare: function* (c) {
      const g = c.g;
      // campos com unidades aliadas (escondida: só aquele campo)
      const bfs = g.bfs
        .map((_, i) => i)
        .filter((i) => (c.hiddenBf === undefined || i === c.hiddenBf) && g.unitsAtBf(i, c.p).length > 0);
      if (!bfs.length) c.data[key(c)] = -1;
      else if (bfs.length === 1) c.data[key(c)] = bfs[0];
      else {
        const [k] = yield* g.ask(
          c.p,
          'choose',
          "Emperor's Divide: unidades de qual campo?",
          bfs.map((i) => ({ id: String(i), label: g.name(g.bfs[i].objId), obj: g.bfs[i].objId })),
        );
        c.data[key(c)] = Number(k);
      }
      return true;
    },
    targets: [
      {
        prompt: "Emperor's Divide: quais unidades suas voltam para a base? (qualquer número)",
        filter: okUnit,
        min: 0,
        max: 99,
      },
    ],
    resolve: function* (c) {
      // todas se movem juntas (uma instrução); são aliadas, então a base é a de c.p
      const us = c.targets[0].filter((u) => u.zone === 'board' && u.controller === c.p);
      if (us.length) c.g.moveUnits(us, { t: 'base', p: c.p }, c.p);
    },
  },
});
