import { registerCard } from '../../engine/script';

// [Assault]. [Deathknell] Compre 1. Se for a sua Beginning Phase, compre 2 em vez disso.
// "Sua" = de quem controla o Deathknell (quem me controlava ao morrer). Verificado na resolução (ex.: morrer pelo
// Temporary no início do seu turno compra 2).
registerCard({
  code: 'UNL-172',
  keywords: { assault: 1 },
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: comprar 1 (2 na sua Beginning Phase)',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        yield* g.draw(c.p, g.phase === 'beginning' && g.active === c.p ? 2 : 1);
      },
    },
  ],
});
