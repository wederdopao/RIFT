import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. Equip [Fury]. Texto de efeito (vale para a unidade equipada): [Assault 2].
registerCard({
  code: 'SFD-009',
  equipCost: E(0, 'Fury'),
  equipped: { keywords: { assault: 2 } },
});
