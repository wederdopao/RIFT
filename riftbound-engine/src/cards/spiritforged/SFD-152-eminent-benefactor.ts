import { registerCard } from '../../engine/script';

// Quando eu seguro (hold), jogue duas fichas de gear Gold exauridas (gear vai para a sua base).
registerCard({
  code: 'SFD-152',
  triggers: [
    {
      on: 'hold',
      label: 'Duas fichas Gold exauridas',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        for (let k = 0; k < 2; k++) c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
