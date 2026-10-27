import { registerCard } from '../../engine/script';

// Deathknell: jogue três fichas Recruit de 1 de Might na sua base.
registerCard({
  code: 'OGN-239',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: três fichas Recruit na base',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        for (let k = 0; k < 3; k++) yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
