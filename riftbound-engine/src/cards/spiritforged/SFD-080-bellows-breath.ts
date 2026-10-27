import { registerCard, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { E } from '../helpers';

// Action. Repeat [1][Mind]. Cause 1 de dano a até três unidades no mesmo local.
// - "Até três": de zero a três alvos (355.13), escolhidos um a um ao jogar; o local é só restrição (355.10.b) e pode
//   ser uma base. Cada execução do Repeat escolhe os seus, em qualquer local (FAQ riftjudge #1306).
// - "No mesmo local" é restrição de grupo, conferida ao jogar (355.11). Na resolução, se os alvos não estão mais juntos,
//   o jogador escolhe um local onde há alvos e um subconjunto deles (355.11.b; FAQ #9352, #9018, #11138).
const resolving = (c: Ctx) => !!c.item && c.g.resolvingItem === c.item;
const sameLoc = (c: Ctx, o: Obj, k: number) => {
  if (resolving(c)) return true; // a restrição de grupo é tratada no resolve
  const prev = c.targets.slice(0, k).flat();
  if (prev.length < k) return false; // o anterior ficou vazio: acabou a escolha
  return !prev.some((p) => p.id === o.id) && prev.every((p) => c.g.locEq(c.g.locOf(p), c.g.locOf(o)));
};
const spec = (k: number) => ({
  prompt: `Bellows Breath: ${k + 1}ª unidade (1 de dano; todas no mesmo local) — ou nenhuma`,
  min: 0,
  max: 1,
  filter: (c: Ctx, o: Obj) => sameLoc(c, o, k),
});
registerCard({
  code: 'SFD-080',
  keywords: { action: true },
  repeat: E(1, 'Mind'),
  spell: {
    label: 'Bellows Breath',
    targets: [spec(0), spec(1), spec(2)],
    resolve: function* (c) {
      const g = c.g;
      let us = c.targets.flat().filter((u) => u.zone === 'board');
      const locs: Obj[][] = [];
      for (const u of us) {
        const grp = locs.find((x) => g.locEq(g.locOf(x[0]), g.locOf(u)));
        if (grp) grp.push(u);
        else locs.push([u]);
      }
      if (locs.length > 1) {
        const [k] = yield* g.ask(
          c.p,
          'choose',
          'Bellows Breath: os alvos não estão mais no mesmo local. Causar dano aos alvos de qual local?',
          locs.map((grp, i) => ({ id: String(i), label: `${g.locName(g.locOf(grp[0]))}: ${grp.map((u) => g.name(u)).join(', ')}` })),
        );
        const grp = locs[Number(k)];
        us = grp.length > 1 ? yield* g.chooseObj(c.p, 'Bellows Breath: quais desses alvos recebem o dano?', grp, 0, grp.length) : grp;
      }
      for (const u of us) g.dealDamage(u, 1, c.self);
    },
  },
});
