import { registerCard } from '../../engine/script';

// Quando você me joga, compre 1 se as suas outras unidades têm Might total 5 ou mais.
// O "se" vem depois do efeito ("draw 1 if..."), não logo após a condição do gatilho: é checado na resolução (383.2.b;
// riftboundfaq.com, Abilities #trigger-time-conditions). Might negativo conta como 0 ao ser referido (143.2.c).
registerCard({
  code: 'UNL-097',
  onPlay: [
    {
      label: 'Comprar 1 se suas outras unidades têm Might total 5+',
      resolve: function* (c) {
        const g = c.g;
        const total = g
          .units()
          .filter((u) => u.controller === c.p && u.id !== c.self.id)
          .reduce((s, u) => s + Math.max(0, g.might(u)), 0);
        if (total >= 5) yield* g.draw(c.p, 1);
        else g.say(`${g.name(c.self)}: as outras unidades somam ${total} de Might; não compra.`, c.p);
      },
    },
  ],
});
