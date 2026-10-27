import { registerCard } from '../../engine/script';

// Quando você me joga, dê Buff a até quatro unidades aliadas.
// Quando você gasta um buff, jogue uma ficha de gear Gold exaurida.
// As unidades são escolhidas ao pôr o gatilho na pilha (alvos, regra 355.5). Cada buff gasto dispara uma vez.
registerCard({
  code: 'SFD-101',
  onPlay: [
    {
      label: 'Buff em até quatro unidades aliadas',
      targets: [{ prompt: 'Fae Dragon: dar Buff a até quatro unidades aliadas', filter: (c, o) => o.controller === c.p, min: 0, max: 4 }],
      resolve: function* (c) {
        for (const u of c.targets[0] || []) c.g.buff(u, c.p);
      },
    },
  ],
  triggers: [
    {
      on: 'spendBuff',
      label: 'Buff gasto: jogar uma ficha Gold exaurida',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
