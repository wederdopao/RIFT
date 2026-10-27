import { registerCard } from '../../engine/script';

// Meu Might aumenta pelo número de cartas no seu descarte.
// No início da sua Beginning Phase, recicle 3 do seu descarte (escolhidas por você; se houver menos, todas — regra
// 416.6; várias cartas vão para o fundo do deck em ordem aleatória — regra 416.5).
registerCard({
  code: 'OGN-109',
  mightMod: (g, self) => g.pl[self.controller].trash.length,
  triggers: [
    {
      on: 'beginStart',
      label: 'Reciclar 3 do descarte',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const trash = g.pl[c.p].trash.map((id) => g.objs[id]);
        if (!trash.length) return g.say('Dr. Mundo: o descarte está vazio.', c.p);
        const picked = trash.length <= 3 ? trash : yield* g.chooseObj(c.p, 'Dr. Mundo: reciclar quais 3 cartas do descarte?', trash, 3, 3);
        for (const o of g.rng.shuffle([...picked])) g.recycleCard(o);
        g.say(`${g.pname(c.p)} recicla ${picked.length} carta(s) do descarte.`, c.p);
      },
    },
  ],
});
