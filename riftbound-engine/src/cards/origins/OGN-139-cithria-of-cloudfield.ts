import { registerCard } from '../../engine/script';

// Quando você joga outra unidade, me dê Buff.
registerCard({
  code: 'OGN-139',
  triggers: [
    {
      on: 'play',
      label: 'Buff em mim (você jogou outra unidade)',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && ev.obj.id !== c.self.id && c.g.isUnit(ev.obj),
      resolve: function* (c) {
        c.g.buff(c.self, c.p);
      },
    },
  ],
});
