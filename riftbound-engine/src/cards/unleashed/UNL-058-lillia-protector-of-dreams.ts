import { registerCard } from '../../engine/script';

// Quando você joga uma ficha de unidade, dê +1 [Might] a mim neste turno. As suas fichas de unidade têm [Tank].
// Criar uma ficha de unidade é jogá-la (185.2.a; o motor emite 'play' com token).
registerCard({
  code: 'UNL-058',
  triggers: [
    {
      on: 'play',
      label: '+1 de Might neste turno (ficha de unidade jogada)',
      cond: (c, ev) => ev.player === c.p && !!ev.token && !!ev.obj && c.g.isUnit(ev.obj),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 1);
      },
    },
  ],
  auras: [
    {
      keywords: (g, src, t) => (t.token && g.isUnit(t) && t.controller === src.controller ? { tank: true } : undefined),
    },
  ],
});
