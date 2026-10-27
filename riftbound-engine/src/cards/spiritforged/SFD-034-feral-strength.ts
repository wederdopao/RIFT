import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// [Reaction]. [Repeat][2]. Dê +2 de Might a uma unidade neste turno. O alvo da repetição é escolhido à parte
// (pode ser a mesma unidade ou outra).
registerCard({
  code: 'SFD-034',
  keywords: { reaction: true },
  repeat: E(2),
  spell: {
    label: 'Feral Strength',
    targets: [{ prompt: 'Feral Strength: +2 de Might em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, 2);
    },
  },
});
