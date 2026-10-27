import { registerCard } from '../../engine/script';

// Vision. Quando você recicla uma ou mais cartas para o seu Main Deck, dê Buff a uma unidade aliada.
// - "Você recicla": quem recicla é o jogador instruído a reciclar (ev.by); cada carta vai para o deck do dono
//   (regra 416.1.c), e a errata ("to your Main Deck") exige que a carta vá para o seu deck (ev.player = dono).
// - "Uma ou mais": uma mesma ação de reciclar várias cartas dispara uma vez; ações separadas (cada Vision, por
//   exemplo) disparam cada uma (riftjudge FAQ #4034). A ação é identificada por ev.batch.
// - Runas não são cartas (o motor não emite o evento para runas).
registerCard({
  code: 'OGN-235',
  keywords: { vision: 1 },
  triggers: [
    {
      on: 'recycle',
      label: 'Buff numa unidade aliada',
      cond: (c, ev) =>
        ev.by === c.p &&
        ev.player === c.p &&
        !c.g.pending.some((x) => x.sourceId === c.self.id && x.ev?.type === 'recycle' && x.ev.batch === ev.batch),
      targets: [{ prompt: 'Karma: Buff em qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
