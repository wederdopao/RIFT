import { registerCard } from '../../engine/script';

// Entro pronta. Ao jogar, prepare todas as unidades inimigas. Outras unidades entram prontas. Unidades não se preparam no despertar.
registerCard({
  code: 'RAD-019',
  entersReady: () => true,
  onPlay: [
    {
      label: 'Preparar todas as unidades inimigas',
      resolve: function* (c) {
        for (const u of c.g.units()) if (u.controller !== c.p) c.g.ready(u, c.p);
      },
    },
  ],
  auras: [
    {
      enterReady: (g, src, unit) => src.zone === 'board' && unit.id !== src.id,
      noAwaken: (g, src) => src.zone === 'board',
    },
  ],
});
