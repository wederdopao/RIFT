import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Cost, Obj, P } from '../../engine/types';

// Você pode matar uma unidade aliada como custo adicional para me jogar. Se fizer, eu custo [1] a menos para cada
// Energia que ela custa e [Order] a menos para cada Power que ela custa. [Ganking]. Quando eu ataco, o defensor tem de
// matar uma das unidades dele aqui.
// - Custo adicional opcional decidido ao jogar (355.1.a); a unidade é escolhida aí e morre ao pagar (357.2). O desconto
//   usa o custo impresso dela (ficha: 0, mas o custo é pago e vale: RiftJudge #9993). Morte substituída (Soraka, Zhonya)
//   ainda paga o custo e dá o desconto (357.2.a; RiftJudge #11247).
// - 357.3: não se escolhe uma unidade que deixe o resto do custo impagável, se houver outra.
// - Gatilho de ataque: não é alvo; o defensor escolhe na resolução uma unidade dele aqui (RiftJudge #8755, #9598: passa
//   por "não pode ser escolhida"). Também dispara se eu virar atacante depois de o combate começar (RiftJudge #9971).
//   "Aqui" = o meu campo na resolução; se eu saí, nada acontece.
const cutOf = (g: Engine, u: Obj) => ({ e: g.data(u).energy, p: g.data(u).power });
const reduce = (cost: Cost, cut: { e: number; p: number }): Cost => {
  const power = [...cost.power];
  for (let k = 0; k < cut.p; k++) {
    const i = power.findIndex((pip) => pip.includes('Order'));
    if (i < 0) break;
    power.splice(i, 1);
  }
  return { energy: Math.max(0, cost.energy - cut.e), power };
};
const mine = (g: Engine, p: P) => g.units().filter((u) => u.controller === p);
registerCard({
  code: 'UNL-170',
  keywords: { ganking: true },
  optionalCosts: [
    {
      label: 'Matar uma unidade sua como custo adicional ([1] a menos por energia e [Order] a menos por power que ela custa)?',
      flag: 'atakhanKilled',
      canPay: (g, self, p) => mine(g, p).length > 0,
      best: (g, self, p, cost) => {
        const us = mine(g, p);
        const ok = us.find((u) => g.canPay(p, reduce(cost, cutOf(g, u))));
        const top = ok ?? us.reduce((a, b) => (cutOf(g, b).e + cutOf(g, b).p > cutOf(g, a).e + cutOf(g, a).p ? b : a), us[0]);
        return top ? reduce(cost, cutOf(g, top)) : cost;
      },
      pay: function* (c) {
        const g = c.g;
        let us = mine(g, c.p);
        if (!us.length) return false;
        const base: Cost = c.data.costSoFar ?? g.minCostFor(c.p, c.self, 'hand');
        const ok = us.filter((u) => g.canPay(c.p, reduce(base, cutOf(g, u))));
        if (ok.length) us = ok;
        const [u] = yield* g.chooseObj(c.p, 'Atakhan: matar qual unidade sua (custo adicional)?', us);
        if (!u) return false;
        c.data.atakhanCut = cutOf(g, u);
        yield* g.killG(u, 'é sacrificada');
        return true;
      },
      adjust: (c, cost) => (c.data.atakhanCut ? reduce(cost, c.data.atakhanCut) : cost),
    },
  ],
  triggers: [
    {
      on: 'attack',
      label: 'O defensor mata uma das unidades dele aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const i = c.self.zone === 'board' ? g.bfIndex(c.self) : -1;
        const sd = g.showdown;
        if (i < 0 || !sd?.combat || sd.bf !== i || sd.defender === undefined) return;
        const d = sd.defender;
        const us = g.unitsAtBf(i, d);
        if (!us.length) return;
        const [u] = yield* g.chooseObj(d, 'Atakhan: qual unidade sua aqui vai morrer?', us);
        if (u) yield* g.killG(u);
      },
    },
  ],
});
