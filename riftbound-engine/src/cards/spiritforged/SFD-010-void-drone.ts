import { registerCard } from '../../engine/script';

// Eu custo [2] a menos para jogar de qualquer lugar que não seja a sua mão.
// Ao calcular o custo a carta ainda está na zona de onde é jogada (descarte, deck, escondida...).
registerCard({
  code: 'SFD-010',
  selfCostMod: (g, self, p) => (self.zone === 'hand' && g.pl[p].hand.includes(self.id) ? 0 : -2),
});
