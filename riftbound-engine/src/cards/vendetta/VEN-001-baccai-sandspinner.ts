import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Baccai Sandspinner
registerCard({
  code: 'VEN-001',
  // "[Empower][5] This ability costs [3] less if you control 4 or fewer runes" (texto que altera o custo, 827.1.c.3)
  empower: { cost: (g, _self, p) => E(runes(g, p) <= 4 ? 2 : 5) },
  kwMod: (g, self) => (self.empowered ? { deflect: 1, assault: 2 } : undefined),
});
