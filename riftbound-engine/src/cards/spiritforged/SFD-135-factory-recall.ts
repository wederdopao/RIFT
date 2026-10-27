import { registerCard } from '../../engine/script';

// Action. Devolva um gear para a mão do dono. Ficha de gear (Gold) que vai para a mão deixa de existir.
registerCard({
  code: 'SFD-135',
  keywords: { action: true },
  spell: {
    label: 'Factory Recall',
    targets: [{ prompt: 'Factory Recall: devolver qual gear para a mão do dono?', kind: 'gear' }],
    resolve: function* (c) {
      const gear = c.targets[0][0];
      if (gear) c.g.returnToHand(gear);
    },
  },
});
