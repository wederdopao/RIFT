import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Order]. Bônus de Might +3 (mightBonus da carta).
registerCard({ code: 'SFD-161', equipCost: E(0, 'Order') });
