import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipamento: Equip [Body]. +2 de Might (bônus impresso, aplicado pelo motor enquanto preso).
registerCard({
  code: 'SFD-095',
  equipCost: E(0, 'Body'),
});
