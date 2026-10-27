import { registerCard } from '../../engine/script';
// Quando você me joga, devolva um spell do seu descarte para a mão.
registerCard({
  code: 'OGS-010',
  onPlay: [
    {
      label: 'Devolver um spell do descarte para a mão',
      targets: [
        {
          prompt: 'Qual spell do seu descarte volta para a mão?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && c.g.kind(o) === 'spell',
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
