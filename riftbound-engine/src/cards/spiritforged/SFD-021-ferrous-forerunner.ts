import { registerCard } from '../../engine/script';

// Deathknell: jogue duas fichas de unidade Mech 3 na sua base.
registerCard({
  code: 'SFD-021',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: duas fichas Mech 3 na base',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        for (let k = 0; k < 2; k++) yield* c.g.playTokenG('TOK-MECH', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
