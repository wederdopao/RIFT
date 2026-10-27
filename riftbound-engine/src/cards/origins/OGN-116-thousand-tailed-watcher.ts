import { registerCard } from '../../engine/script';

// Accelerate. Quando você me joga, dê -3 de Might às unidades inimigas neste turno, até um mínimo de 1.
registerCard({
  code: 'OGN-116',
  keywords: { accelerate: true },
  onPlay: [
    {
      label: '-3 de Might nas unidades inimigas (mínimo 1)',
      resolve: function* (c) {
        for (const u of c.g.units().filter((o) => o.controller !== c.p)) c.g.giveMight(u, -3, 'turn', 1);
      },
    },
  ],
});
