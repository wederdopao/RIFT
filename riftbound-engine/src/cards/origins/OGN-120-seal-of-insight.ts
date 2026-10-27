import { registerCard } from '../../engine/script';

// Exaurir: Reaction – Add [Mind].
registerCard({
  code: 'OGN-120',
  activated: [
    {
      label: 'Exaurir: adicionar 1 power Mind',
      exhaustSelf: true,
      isAdd: true,
      addPower: 'Mind',
      timing: 'reaction',
      resolve: function* (c) {
        c.g.addResources(c.p, 0, ['Mind']);
      },
    },
  ],
});
