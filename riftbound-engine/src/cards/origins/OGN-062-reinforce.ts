import { registerCard } from '../../engine/script';

// Olhe as 5 cartas do topo do seu deck. Você pode banir uma unidade entre elas e depois jogá-la, com custo [5]
// menor. Recicle as outras.
registerCard({
  code: 'OGN-062',
  spell: {
    label: 'Reinforce',
    resolve: function* (c) {
      const g = c.g;
      // olhar o topo (Nocturne, Horrifying pode ser banida ao ser olhada)
      const top = (yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 5))).map((id) => g.objs[id]);
      if (!top.length) return;
      g.say(`${g.pname(c.p)} olha o topo do deck (Reinforce).`, c.p);
      // "reduzindo o custo em [5]": desconto de energia aplicado como na jogada normal, depois dos custos adicionais
      // (Accelerate também é oferecido: 419.3.b; descontos reduzem custos adicionais: 356.4.f)
      const costOf = (u: (typeof top)[number]) => g.effectCost(c.p, u, g.printedCost(u), 5);
      const units = top.filter((o) => g.isUnit(o));
      const seen = top.map((o) => g.name(o)).join(', ');
      const ids = yield* g.ask(
        c.p,
        'choose',
        `Reinforce: topo do deck — ${seen}. Banir uma unidade e jogá-la (custo 5 menor)?`,
        units.map((o) => ({
          id: o.id,
          label: `${g.name(o)} (${g.costText(costOf(o))}${g.canPay(c.p, costOf(o)) ? '' : ' — sem recursos para jogar'})`,
          obj: o.id,
        })),
        0,
        1,
      );
      const pick = ids.length ? g.objs[ids[0]] : null;
      if (pick) {
        g.banishObj(pick);
        yield* g.playFromEffect(c.p, pick, g.printedCost(pick), undefined, { discount: 5 });
      }
      // "Recicle as outras": ao mesmo tempo, em ordem aleatória (416.5)
      const rest = top.filter((o) => o !== pick && o.zone === 'mainDeck');
      yield* g.recycleCards(rest);
      if (rest.length) g.say(`${g.pname(c.p)} recicla ${rest.length} carta(s).`, c.p);
    },
  },
});
