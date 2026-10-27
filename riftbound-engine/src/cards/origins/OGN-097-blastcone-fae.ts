import { registerCard } from '../../engine/script';

// Hidden. Quando você me joga, dê -2 de Might a uma unidade neste turno, até um mínimo de 1.
registerCard({
  code: 'OGN-097',
  keywords: { hidden: true },
  onPlay: [
    {
      label: '-2 de Might numa unidade (mínimo 1)',
      targets: [
        {
          prompt: 'Blastcone Fae: -2 de Might em qual unidade?',
          // jogada a partir de Hidden: o alvo tem de estar neste campo (regra 811.1.d.2)
          filter: (c, o) => c.ev?.via !== 'hidden' || c.g.bfIndex(o) === (c.ev?.loc as any)?.i,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -2, 'turn', 1);
      },
    },
  ],
});
