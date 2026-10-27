import { registerCard } from '../../engine/script';

// Devolva até 2 unidades de descartes às mãos dos donos. Os alvos são escolhidos ao jogar.
registerCard({
  code: 'VEN-103',
  spell: {
    label: 'Shadows of the Past',
    targets: [{ prompt: 'Shadows of the Past: até 2 unidades de descartes (voltam à mão dos donos)', kind: 'trash', min: 0, max: 2, filter: (c, o) => c.g.isUnit(o) }],
    resolve: function* (c) {
      const g = c.g;
      for (const o of c.targets[0] || []) {
        if (o.zone !== 'trash') continue;
        g.toZone(o, 'hand', { player: o.owner });
        g.say(`${g.name(o)} volta do descarte para a mão de ${g.pname(o.owner)}.`, c.p);
      }
    },
  },
});
