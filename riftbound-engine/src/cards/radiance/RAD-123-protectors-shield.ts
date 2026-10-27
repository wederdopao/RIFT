import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quick-Draw; Equip [1]. Texto de efeito: [Tank]. Might Bonus +1 (somado pelo motor).
registerCard({
  code: 'RAD-123',
  keywords: { quickDraw: true },
  equipCost: E(1),
  equipped: { keywords: { tank: true } },
});
