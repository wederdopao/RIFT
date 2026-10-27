import { registerCard } from '../../engine/script';

// Quando você me joga, prepare outra unidade.
registerCard({
  code: 'OGN-132',
  onPlay: [
    {
      label: 'Preparar outra unidade',
      targets: [{ prompt: 'First Mate: preparar qual outra unidade?', filter: (c, o) => o.id !== c.self.id }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) {
          c.g.ready(u, c.p);
          c.g.say(`${c.g.name(u)} fica pronta.`);
        }
      },
    },
  ],
});
