import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Hidden. Action. Você pode jogar da mão uma unidade num campo que você controla, reduzindo o custo dela em [3].
// - A unidade da mão não é alvo (zona privada, regra 355.10.a): unidade e campo são escolhidos na resolução.
// - Jogada a partir de Hidden, a unidade só pode ir para o campo onde o Here to Help estava (regra 811.1.d.3).
// - "Reduzindo o custo em [3]": desconto de energia aplicado como na jogada normal (custos adicionais como Accelerate
//   são oferecidos, regra 419.3.b).
registerCard({
  code: 'SFD-111',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Here to Help',
    resolve: function* (c) {
      const g = c.g;
      const bfs: number[] = [];
      g.bfs.forEach((b, i) => {
        if (b.controller === c.p && (c.hiddenBf === undefined || c.hiddenBf === i)) bfs.push(i);
      });
      if (!bfs.length) return g.say('Here to Help: você não controla um campo onde jogar a unidade.', c.p);
      const units = g.pl[c.p].hand.map((id) => g.objs[id]).filter((o) => g.isUnit(o));
      if (!units.length) return g.say('Here to Help: nenhuma unidade na mão.', c.p);
      const costOf = (u: (typeof units)[number]) => g.effectCost(c.p, u, g.printedCost(u), 3);
      const ids = yield* g.ask(
        c.p,
        'choose',
        'Here to Help: jogar qual unidade da mão (custo [3] menor)?',
        units.map((o) => ({
          id: o.id,
          label: `${g.name(o)} (${g.costText(costOf(o))}${g.canPay(c.p, costOf(o)) ? '' : ' — sem recursos para jogar'})`,
          obj: o.id,
        })),
        0,
        1,
      );
      if (!ids.length) return;
      const u = g.objs[ids[0]];
      const okBfs = bfs.filter((i) => g.playLocOk(c.p, u, { t: 'bf', i }));
      if (!okBfs.length) return g.say(`Here to Help: ${g.name(u)} não pode ser jogada nesses campos.`, c.p);
      const [bi] = yield* g.ask(
        c.p,
        'choose',
        `Here to Help: jogar ${g.name(u)} em qual campo?`,
        okBfs.map((i) => ({ id: String(i), label: g.name(g.bfs[i].objId), obj: g.bfs[i].objId })),
      );
      const loc: Loc = { t: 'bf', i: Number(bi) };
      yield* g.playFromEffect(c.p, u, g.printedCost(u), loc, { discount: 3 });
    },
  },
});
