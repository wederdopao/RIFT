import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { atBf } from '../helpers';

// Action. Cause 5 de dano dividido entre unidades de um único campo de batalha.
// As unidades são os alvos; "um único campo" é restrição coletiva do grupo (355.10.b, 355.11.a): o campo é escolhido
// primeiro só para montar o grupo. Na resolução vale qualquer unidade ainda num campo; se o grupo deixou de estar num só
// campo, o controlador escolhe um subconjunto que cumpra a restrição (355.11.b).
registerCard({
  code: 'RAD-006',
  keywords: { action: true },
  spell: {
    label: 'Scorched Earth',
    prepare: function* (c) {
      const g = c.g;
      const bfs = g.bfs.map((_, i) => i).filter((i) => g.unitsAtBf(i).length > 0);
      if (!bfs.length) return false;
      const [id] = yield* g.ask(c.p, 'choose', 'Scorched Earth: em qual campo de batalha?', bfs.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
      c.data.bf = Number(id);
      return true;
    },
    targets: (c) => [
      {
        prompt: 'Scorched Earth: dividir 5 de dano entre quais unidades?',
        filter: (cc, o) => {
          if (!atBf(cc, o)) return false;
          // na resolução (este item resolvendo) a restrição é coletiva e conferida no resolve (355.11.b)
          if (cc.item && cc.g.resolvingItem === cc.item) return true;
          return c.data.bf === undefined || cc.g.bfIndex(o) === c.data.bf;
        },
        min: 1,
        max: c.g.splitMaxTargets(c.self, 5),
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      let us: Obj[] = c.targets[0] || [];
      const bfs = [...new Set(us.map((u) => g.bfIndex(u)))];
      if (bfs.length > 1) {
        // 355.11.b: o grupo não está mais num só campo; o controlador escolhe um subconjunto que cumpra a restrição
        const [id] = yield* g.ask(c.p, 'choose', 'Scorched Earth: os alvos estão em campos diferentes; manter os de qual campo?', bfs.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
        const grp = us.filter((u) => g.bfIndex(u) === Number(id));
        us = grp.length > 1 ? yield* g.chooseObj(c.p, 'Scorched Earth: quais desses continuam como alvo?', grp, 1, grp.length) : grp;
      }
      yield* g.dealSplit(c.p, c.self, 5, us, 'Scorched Earth');
    },
  },
  canPlay: (g) => g.units().some((u) => g.bfIndex(u) >= 0),
});
