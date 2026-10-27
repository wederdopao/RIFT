import { registerCard } from '../../engine/script';

// Action: dobre o Might de uma unidade aliada neste turno. Dê Temporary a ela.
registerCard({
  code: 'OGN-069',
  keywords: { action: true },
  spell: {
    label: 'Last Stand',
    targets: [{ prompt: 'Last Stand: dobrar o Might de qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      // dobrar = aumentar pelo valor atual (regra 432.1)
      const m = c.g.might(u);
      if (m !== 0) c.g.giveMight(u, m);
      c.g.addEffect({ target: u.id, kw: { temporary: true }, until: 'perm' });
      c.g.say(`${c.g.name(u)} ganha Temporary.`);
    },
  },
});
