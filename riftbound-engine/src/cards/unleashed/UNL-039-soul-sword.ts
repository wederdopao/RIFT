import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. [Equip] [Calm]. Bônus de Might impresso +1 (o motor soma, 137.3).
// Texto de efeito: "[Level 3] Eu tenho +1 [Might] adicional." No texto de efeito "eu" é a unidade equipada e "você" é o
// controlador dela (136.2.c-d); o Level confere o XP desse controlador (g.levelReached(unit, 3)) (824.1.c, 824.1.c.1).
registerCard({
  code: 'UNL-039',
  equipCost: E(0, 'Calm'),
  equipped: { mightMod: (g, gear, unit) => (g.levelReached(unit, 3) ? 1 : 0) },
});
