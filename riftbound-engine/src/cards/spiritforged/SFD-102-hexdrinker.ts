import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipamento: Equip [Body]. Texto de efeito (vale para a unidade equipada): Deflect.
// Solto, o Hexdrinker não tem Deflect: o texto de efeito só vale preso (regra 136.2.b; FAQ riftjudge #8560); quem
// escolhe o próprio equipamento preso também não paga Deflect (FAQ riftjudge #8669).
registerCard({
  code: 'SFD-102',
  equipCost: E(0, 'Body'),
  equipped: { keywords: { deflect: 1 } },
});
