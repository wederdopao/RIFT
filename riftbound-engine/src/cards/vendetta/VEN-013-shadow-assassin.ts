import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Shadow Assassin
registerCard({
  code: 'VEN-013',
  entersReady: (g, self) => g.pl[self.owner].trash.some((id) => g.data(g.objs[id]).name === 'Shadow Assassin'),
});
