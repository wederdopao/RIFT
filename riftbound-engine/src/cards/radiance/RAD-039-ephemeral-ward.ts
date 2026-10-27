import { registerCard } from '../../engine/script';

// Suas unidades têm +2 de Might. Quando você joga uma unidade, mate isto.
registerCard({
  code: 'RAD-039',
  auras: [{ might: (g, src, t) => (src.zone === 'board' && t.controller === src.controller && g.isUnit(t) ? 2 : 0) }],
  triggers: [
    {
      on: 'play',
      label: 'Jogou uma unidade: matar Ephemeral Ward',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && c.g.isUnit(ev.obj),
      resolve: function* (c) {
        if (c.self.zone === 'board') yield* c.g.killG(c.self);
      },
    },
  ],
});
