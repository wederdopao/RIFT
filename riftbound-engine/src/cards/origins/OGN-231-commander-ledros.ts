import { registerCard } from '../../engine/script';
import type { Cost } from '../../engine/types';

// Ao me jogar, você pode matar quantas unidades aliadas quiser como custo adicional. Cada uma reduz meu custo em
// [Order]. Deflect. Ganking.
// - Custo adicional opcional: a decisão é tomada ao jogar (355.1.a) e as unidades morrem ao pagar (357.2), juntas.
// - "Para cada uma morta assim": só conta unidade que realmente morreu (morte substituída não conta; riftjudge
//   FAQ #377).
// - Não se pode pagar um custo que deixa a jogada impossível (357.3): o mínimo de unidades é o que torna o resto
//   pagável; acima disso, quantas quiser.
const cut = (cost: Cost, n: number): Cost => {
  const power = [...cost.power];
  for (let k = 0; k < n; k++) {
    const i = power.findIndex((pip) => pip.includes('Order'));
    if (i < 0) break;
    power.splice(i, 1);
  }
  return { ...cost, power };
};
registerCard({
  code: 'OGN-231',
  keywords: { deflect: 1, ganking: true },
  optionalCosts: [
    {
      label: 'Matar unidades suas para reduzir o custo em [Order] por unidade?',
      flag: 'killed',
      canPay: (g, self, p) => g.units().some((u) => u.controller === p),
      best: (g, self, p, cost) => cut(cost, g.units().filter((u) => u.controller === p).length),
      pay: function* (c) {
        const g = c.g;
        const us = g.units().filter((u) => u.controller === c.p);
        if (!us.length) return false;
        // custo até aqui (jogada por efeito informa em costSoFar; da mão/zona de campeão é o custo com descontos)
        const base: Cost = c.data.costSoFar ?? g.minCostFor(c.p, c.self, 'hand');
        let min = 1;
        while (min < us.length && !g.canPay(c.p, cut(base, min))) min++;
        const chosen = yield* g.chooseObj(c.p, 'Commander Ledros: matar quais unidades suas? (cada uma tira 1 [Order] do custo)', us, min, us.length);
        yield* g.killG(chosen, 'é sacrificada');
        // só as que morreram de fato (fichas deixam de existir; mortes substituídas ficam no tabuleiro ou vão para outra zona)
        c.data.ledrosKilled = chosen.filter((u) => u.zone === 'trash' || u.zone === 'gone').length;
        return chosen.length > 0;
      },
      adjust: (c, cost) => cut(cost, c.data.ledrosKilled || 0),
    },
  ],
});
