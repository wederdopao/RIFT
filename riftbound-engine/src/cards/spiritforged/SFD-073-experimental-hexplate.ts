import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Mind]. Texto de efeito (vale para a unidade equipada): "Sou um Mech." (+1 de Might Bonus impresso.)
registerCard({
  code: 'SFD-073',
  equipCost: E(0, 'Mind'),
  equipped: { tags: ['Mech'] },
});
