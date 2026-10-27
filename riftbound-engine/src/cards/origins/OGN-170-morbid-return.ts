import { registerCard } from '../../engine/script';

// Action: devolva uma unidade do seu descarte para a mão.
registerCard({
  code: 'OGN-170',
  keywords: { action: true },
  spell: {
    label: 'Morbid Return',
    targets: [
      {
        prompt: 'Morbid Return: qual unidade do seu descarte volta para a mão?',
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
});
