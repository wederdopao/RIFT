import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipamento. [Equip] [Body]. Texto de efeito: [Hunt] (a unidade equipada ganha Hunt 1; soma com o Hunt dela, 823.2).
// O Might Bonus +2 impresso o motor soma sozinho (137.3).
registerCard({
  code: 'UNL-096',
  equipCost: E(0, 'Body'),
  equipped: { keywords: { hunt: 1 } },
});
