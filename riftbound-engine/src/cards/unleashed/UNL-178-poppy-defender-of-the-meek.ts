import { registerCard } from '../../engine/script';
import { xpOptionalCost } from '../helpers';

// Você pode gastar 3 XP como custo adicional para me jogar. Se fizer, eu custo [3] a menos. [Ambush]. [Tank].
// - O cards.json perdeu o ícone do desconto: na carta é "I cost [3] less" (ícone de energia 3; riftbound.gg UNL-178).
// - Custo adicional opcional decidido ao jogar (355.1.a). Gastar XP = reduzir o XP (730.2): xpOptionalCost.
registerCard({
  code: 'UNL-178',
  keywords: { ambush: true, tank: true },
  optionalCosts: [{ ...xpOptionalCost(3, 'paidXp', 'Gastar 3 XP como custo adicional para custar [3] a menos?'), energyMod: -3 }],
});
