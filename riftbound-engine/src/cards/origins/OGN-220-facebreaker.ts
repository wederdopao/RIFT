import { registerCard, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Hidden, Action: atordoe uma unidade aliada e uma unidade inimiga no mesmo campo de batalha.
// Os dois alvos formam um grupo com restrição comum (regra 355.11). Para escolher, o campo vem primeiro (só os que têm
// unidade aliada e inimiga; jogado de Hidden, só o campo do esconderijo — 811.1.d.2); os dois alvos ficam nele.
// Na resolução (355.11.b): se os dois continuam no mesmo campo (mesmo que outro), os dois são atordoados; se ficaram em
// campos diferentes, o controlador escolhe qual dos dois afetar; um alvo que saiu do campo de batalha é ilegal.
const okBf = (c: Ctx, i: number) =>
  (c.hiddenBf === undefined || c.hiddenBf === i) &&
  c.g.unitsAtBf(i).some((u) => u.controller === c.p) &&
  c.g.unitsAtBf(i).some((u) => u.controller !== c.p);
const resolving = (c: Ctx) => !!c.item && c.g.resolvingItem === c.item;
const inBf = (c: Ctx, o: Obj) => {
  const i = c.g.bfIndex(o);
  if (i < 0) return false;
  if (resolving(c)) return true; // a restrição de grupo é conferida no resolve
  const bf = c.data[`fbBf${c.rep}`]; // por execução: com Repeat (Temporal Portal) cada uma escolhe o campo (820.2.a)
  return bf === undefined ? okBf(c, i) : i === bf;
};
registerCard({
  code: 'OGN-220',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Facebreaker',
    prepare: function* (c) {
      const bfs = c.g.bfs.map((_, i) => i).filter((i) => okBf(c, i));
      if (!bfs.length) return false;
      const [id] = yield* c.g.ask(
        c.p,
        'choose',
        'Facebreaker: em qual campo?',
        bfs.map((i) => ({ id: String(i), label: c.g.name(c.g.bfs[i].objId), obj: c.g.bfs[i].objId })),
      );
      c.data[`fbBf${c.rep}`] = Number(id);
      return true;
    },
    targets: [
      { prompt: 'Facebreaker: atordoar qual unidade sua?', filter: (c, o) => o.controller === c.p && inBf(c, o) },
      { prompt: 'Facebreaker: atordoar qual unidade inimiga?', filter: (c, o) => o.controller !== c.p && inBf(c, o) },
    ],
    resolve: function* (c) {
      const g = c.g;
      let us = c.targets.flat();
      if (us.length === 2 && g.bfIndex(us[0]) !== g.bfIndex(us[1])) {
        // o grupo não cumpre mais "no mesmo campo": escolhe-se um subconjunto que cumpra (um deles)
        us = yield* g.chooseObj(c.p, 'Facebreaker: os alvos estão em campos diferentes. Atordoar qual deles?', us);
      }
      const batch = ++g.stunBatch; // uma instrução só: "uma ou mais" dispara uma vez
      for (const u of us) g.stun(u, c.p, batch);
    },
  },
});
