import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. [Quick-Draw] (tem [Reaction]; ao ser jogado, é anexado a uma unidade sua). [Equip][Calm].
// O +3 de Might vem do bônus de Might da carta.
registerCard({
  code: 'SFD-056',
  keywords: { quickDraw: true },
  equipCost: E(0, 'Calm'),
});
