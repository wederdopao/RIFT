import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-097',
  keywords: { hidden: true },
  mightMod: (g, self) =>
    self.loc ? g.unitsAt(self.loc).filter((u) => u.id !== self.id && u.controller === self.controller && g.data(u).name === 'Spiderling').length : 0,
});
