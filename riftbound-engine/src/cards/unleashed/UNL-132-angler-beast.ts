import { registerCard } from '../../engine/script';

// Unidade 5. Quando você me joga, devolva todas as unidades com 2 de Might ou menos para a mão dos donos.
// - Não escolhe nada (355.10.d): na resolução, todas as unidades no tabuleiro (aliadas e inimigas, em qualquer local) com
//   Might atual ≤ 2 voltam juntas. Fichas deixam de existir (186.1).
registerCard({
  code: 'UNL-132',
  onPlay: [
    {
      label: 'Devolver todas as unidades com 2 de Might ou menos',
      resolve: function* (c) {
        const g = c.g;
        const us = g.withAuraCache(() => g.units().filter((u) => g.might(u) <= 2));
        for (const u of us) g.returnToHand(u);
      },
    },
  ],
});
