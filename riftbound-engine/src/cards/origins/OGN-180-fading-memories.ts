import { registerCard } from '../../engine/script';

// Dê [Temporary] a uma unidade num campo ou a um gear.
registerCard({
  code: 'OGN-180',
  spell: {
    label: 'Fading Memories',
    targets: [
      {
        prompt: 'Fading Memories: unidade num campo ou gear',
        kind: 'permanent',
        filter: (c, o) => (c.g.isUnit(o) && c.g.bfIndex(o) >= 0) || c.g.isGear(o),
      },
    ],
    resolve: function* (c) {
      const o = c.targets[0][0];
      if (o) {
        c.g.addEffect({ target: o.id, kw: { temporary: true }, until: 'perm' });
        c.g.say(`${c.g.name(o)} ganha Temporary (morre no início da próxima Beginning Phase do controlador).`);
      }
    },
  },
});
