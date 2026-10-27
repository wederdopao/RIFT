import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-074',
  // "[Empower] — [1] or [Body]": duas instâncias (827.3), cada uma paga por um dos custos
  empower: [{ cost: E(1) }, { cost: E(0, 'Body') }],
  mightMod: (g, self) => (self.empowered ? 1 : 0),
});
