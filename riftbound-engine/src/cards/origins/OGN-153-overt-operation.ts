import { registerCard } from '../../engine/script';

// Action. Para cada unidade aliada, você pode gastar o Buff dela para prepará-la. Depois dê Buff a todas as unidades aliadas.
registerCard({
  code: 'OGN-153',
  keywords: { action: true },
  spell: {
    label: 'Overt Operation',
    resolve: function* (c) {
      const g = c.g;
      const buffed = g.units().filter((u) => u.controller === c.p && u.buffs > 0);
      const chosen = yield* g.chooseObj(
        c.p,
        'Overt Operation: gastar o Buff de quais unidades para prepará-las? (pode ser nenhuma)',
        buffed,
        0,
        buffed.length,
      );
      for (const u of chosen) if (g.spendBuff(u)) g.ready(u, c.p);
      if (chosen.length) g.say(`${chosen.map((u) => g.name(u)).join(', ')} gastam o Buff e ficam prontas.`);
      for (const u of g.units().filter((x) => x.controller === c.p)) g.buff(u, c.p);
    },
  },
});
