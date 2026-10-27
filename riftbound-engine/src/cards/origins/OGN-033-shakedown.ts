import { registerCard } from '../../engine/script';

// Reaction: escolha uma unidade inimiga. Cause 6 a ela, a menos que o controlador dela deixe você comprar 2.
registerCard({
  code: 'OGN-033',
  keywords: { reaction: true },
  spell: {
    label: 'Shakedown',
    targets: [{ prompt: 'Shakedown: qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      const pay = yield* g.yesNo(u.controller, `Shakedown: deixar ${g.pname(c.p)} comprar 2 para ${g.name(u)} não levar 6 de dano?`);
      if (pay) {
        g.say(`${g.pname(u.controller)} deixa ${g.pname(c.p)} comprar 2.`, u.controller);
        yield* g.draw(c.p, 2);
      } else g.dealDamage(u, 6, c.self);
    },
  },
});
