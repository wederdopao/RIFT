import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. Quick-Draw (tem Reaction; quando você o joga, equipe-o numa unidade sua). Equip [Fury].
// O +2 de Might é o bônus de Might da carta (aplicado pelo motor à unidade equipada).
registerCard({
  code: 'SFD-022',
  keywords: { quickDraw: true },
  equipCost: E(0, 'Fury'),
});
