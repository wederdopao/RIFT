import { registerCard } from '../../engine/script';

// Hidden. Quando eu defendo, escolha uma unidade inimiga aqui e revele as 5 cartas do topo do seu deck.
// Cause 1 de dano a essa unidade para cada carta com Hidden revelada, depois recicle as cartas reveladas.
// - A unidade é alvo escolhido ao pôr na pilha. O dano é uma única ação de "causar N" (regra 715.4).
// - Cartas reveladas do topo passam pelos ganchos "ao revelar" (Nocturne, Horrifying); as reveladas voltam ao fundo do
//   deck em ordem aleatória (regra 416.5). Com menos de 5 cartas, revela as que houver, sem Burn Out (regra 431.1.c).
registerCard({
  code: 'OGN-121',
  keywords: { hidden: true },
  triggers: [
    {
      on: 'defend',
      label: 'Revelar 5: 1 de dano por carta com Hidden',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Teemo: escolha uma unidade inimiga aqui',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      alwaysResolve: true, // o alvo pode ter saído, mas as cartas ainda são reveladas e recicladas (359.3.e.5)
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        const top = yield* g.revealTop(c.p, 5); // revealTop: Void Hatchling, Nocturne, Undertitan
        // carta com Hidden = tem a palavra-chave, não só cita [Hidden] no texto (Ember Monk, Noxus Saboteur)
        const n = top.filter((o) => !!g.kw(o).hidden).length;
        g.say(`Teemo revela: ${top.map((o) => g.name(o)).join(', ') || 'nada'} — ${n} com Hidden.`, c.p);
        if (u && n) g.dealDamage(u, n, c.self);
        for (const o of g.rng.shuffle([...top])) g.recycleCard(o);
      },
    },
  ],
});
