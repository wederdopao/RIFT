import { registerCard } from '../../engine/script';

// [Deathknell] Jogue uma ficha Bird de 1 de Might com [Deflect] na sua base.
// O local é dado pelo texto (a sua base); jogar ficha é uma jogada (185.2.a): playTokenG.
registerCard({
  code: 'UNL-153',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: jogar uma ficha Bird (Deflect) na base',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-BIRD', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
