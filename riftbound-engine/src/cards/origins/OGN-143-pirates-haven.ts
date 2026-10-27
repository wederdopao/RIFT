import { registerCard } from '../../engine/script';

// Gear: quando você prepara uma unidade aliada, dê +1 de Might a ela neste turno.
// Vale para o Awaken e para efeitos que preparam uma unidade exaurida; não vale para unidade que já entra pronta
// (Accelerate, Confront) — FAQ riftjudge #2603, #9115 e #6918.
registerCard({
  code: 'OGN-143',
  triggers: [
    {
      on: 'ready',
      label: '+1 de Might na unidade preparada',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && ev.obj.controller === c.p && c.g.isUnit(ev.obj),
      resolve: function* (c) {
        const u = c.ev!.obj;
        if (u.zone === 'board') c.g.giveMight(u, 1);
      },
    },
  ],
});
