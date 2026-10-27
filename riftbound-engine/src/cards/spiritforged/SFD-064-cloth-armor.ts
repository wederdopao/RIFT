import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quick-Draw (Reaction; ao jogar, anexe a uma unidade sua). Equip [Mind].
// Texto de efeito (vale para a unidade equipada): [Shield 2].
registerCard({
  code: 'SFD-064',
  keywords: { quickDraw: true },
  equipCost: E(0, 'Mind'),
  equipped: { keywords: { shield: 2 } },
});
