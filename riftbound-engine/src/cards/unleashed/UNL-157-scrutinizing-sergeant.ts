import { registerCard } from '../../engine/script';

// Quando você me joga, ganhe 1 XP para cada unidade aliada.
// Contado na resolução (eu mesmo conto, se ainda estiver no tabuleiro): unidades que você controla em qualquer local.
registerCard({
  code: 'UNL-157',
  onPlay: [
    {
      label: 'Ganhar 1 XP por unidade aliada',
      resolve: function* (c) {
        const n = c.g.units().filter((u) => u.controller === c.p).length;
        if (n) c.g.gainXp(c.p, n, c.self);
      },
    },
  ],
});
