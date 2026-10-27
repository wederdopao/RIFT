import { registerCard } from '../../engine/script';

// Quando você joga uma carta no turno de um oponente, jogue uma ficha de Recruit 1 na sua base.
// Spells: dispara quando a jogada termina com a resolução (419.4.a); spell anulado não conta.
registerCard({
  code: 'OGN-117',
  triggers: [
    {
      on: 'play',
      label: 'Jogar um Recruit na base',
      cond: (c, ev) => ev.player === c.p && c.g.active !== c.p && !!ev.obj && !ev.obj.token,
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
