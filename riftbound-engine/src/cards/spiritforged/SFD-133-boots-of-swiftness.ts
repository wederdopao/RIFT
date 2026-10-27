import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Caos]. Efeito: a unidade equipada tem Ganking. O +2 de Might vem do bônus impresso (mightBonus).
registerCard({
  code: 'SFD-133',
  equipCost: E(0, 'Chaos'),
  equipped: { keywords: { ganking: true } },
});
