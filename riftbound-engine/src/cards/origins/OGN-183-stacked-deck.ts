import { registerCard } from '../../engine/script';

// Action: olhe as 3 cartas do topo do deck principal. Ponha 1 na mão e recicle o resto.
// Olhar o topo passa por lookAtTop (Nocturne).
registerCard({
  code: 'OGN-183',
  keywords: { action: true },
  spell: {
    label: 'Stacked Deck',
    resolve: function* (c) {
      const g = c.g;
      const top = yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 3));
      if (!top.length) return;
      const [id] = yield* g.ask(
        c.p,
        'choose',
        'Stacked Deck: qual carta vai para a mão? (as outras são recicladas)',
        top.map((x) => ({ id: x, label: g.name(x), obj: x })),
      );
      const pick = g.objs[id];
      g.toZone(pick, 'hand');
      // as recicladas juntas vão para o fundo em ordem aleatória (regra 416.5); uma ação só (Karma)
      yield* g.recycleCards(top.filter((x) => x !== id).map((x) => g.objs[x]), { by: c.p });
      g.say(`${g.pname(c.p)} põe 1 carta na mão e recicla ${top.length - 1}.`, c.p);
    },
  },
});
