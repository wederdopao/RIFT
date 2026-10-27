import { registerCard } from '../../engine/script';

// Quando você me joga, prepare outro Mech aliado.
// "Mech" é tag (o banco grafa "mech" nesta carta; Engine.hasTag não diferencia maiúsculas e conta Experimental Hexplate).
registerCard({
  code: 'SFD-062',
  onPlay: [
    {
      label: 'Preparar outro Mech aliado',
      targets: [
        {
          prompt: 'Bubble Bot: preparar qual outro Mech seu?',
          kind: 'permanent',
          filter: (c, o) => o.controller === c.p && o.id !== c.self.id && c.g.hasTag(o, 'Mech'),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && u.zone === 'board') {
          c.g.ready(u, c.p);
          c.g.say(`${c.g.name(u)} fica pronta.`);
        }
      },
    },
  ],
});
