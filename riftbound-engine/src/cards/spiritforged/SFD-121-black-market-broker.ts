import { registerCard } from '../../engine/script';

// Quando você joga uma carta virada para baixo (escondida), jogue uma ficha de gear Gold exaurida.
// Spell jogado escondido: o gatilho dispara quando ele termina de resolver (regra 419.4.a); anulado não conta.
// Ficha de gear sem local especificado vai para a sua base.
registerCard({
  code: 'SFD-121',
  triggers: [
    {
      on: 'play',
      label: 'Ficha Gold exaurida',
      cond: (c, ev) => ev.player === c.p && ev.via === 'hidden' && !ev.token,
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
