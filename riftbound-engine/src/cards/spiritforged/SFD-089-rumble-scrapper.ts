import { registerCard } from '../../engine/script';

// Seus Mechs têm +1 de Might (inclusive eu). Quando eu seguro (hold), jogue uma ficha de unidade Mech de 3 de Might
// na sua base.
registerCard({
  code: 'SFD-089',
  auras: [
    {
      might: (g, src, t) => (src.zone === 'board' && t.controller === src.controller && g.isUnit(t) && g.hasTag(t, 'Mech') ? 1 : 0),
    },
  ],
  triggers: [
    {
      on: 'hold',
      label: 'Jogar uma ficha de Mech na base',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-MECH', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
