import { registerCard } from '../../engine/script';

// Quando você joga isto, jogue uma ficha Recruit de 1 de Might na sua base.
// Mate isto: recicle até 4 cartas dos descartes. (Cartas no descarte são alvos: zona pública, "até 4" — 355.13.)
registerCard({
  code: 'OGN-212',
  onPlay: [
    {
      label: 'Ficha Recruit na base',
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
      },
    },
  ],
  activated: [
    {
      label: 'Matar isto: reciclar até 4 cartas dos descartes',
      killSelf: true,
      targets: [{ prompt: 'Forge of the Future: reciclar até 4 cartas dos descartes', kind: 'trash', min: 0, max: 4 }],
      resolve: function* (c) {
        const os = c.targets[0].filter((o) => o.zone === 'trash');
        // cada carta vai para o deck do dono (416.1.c); várias juntas, em ordem aleatória (416.5); uma ação só (Karma)
        yield* c.g.recycleCards(os, { by: c.p });
        if (os.length) c.g.say(`${c.g.pname(c.p)} recicla ${os.map((o) => c.g.name(o)).join(', ')}.`, c.p);
      },
    },
  ],
});
