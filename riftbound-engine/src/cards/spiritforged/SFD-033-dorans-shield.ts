import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. [Equip][Calm]. Efeito (na unidade equipada): [Tank]. O +1 de Might vem do bônus de Might da carta.
registerCard({
  code: 'SFD-033',
  equipCost: E(0, 'Calm'),
  equipped: { keywords: { tank: true } },
});
