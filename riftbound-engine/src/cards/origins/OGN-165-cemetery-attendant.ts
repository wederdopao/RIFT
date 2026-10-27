import { registerCard } from '../../engine/script';

// Quando você me joga, devolva uma unidade do seu descarte para a mão.
registerCard({
  code: 'OGN-165',
  onPlay: [
    {
      label: 'Devolver uma unidade do descarte para a mão',
      targets: [
        {
          prompt: 'Qual unidade do seu descarte volta para a mão?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && c.g.isUnit(o),
        },
      ],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (o && o.zone === 'trash') {
          c.g.toZone(o, 'hand');
          c.g.say(`${c.g.name(o)} volta do descarte para a mão.`, c.p);
        }
      },
    },
  ],
});
