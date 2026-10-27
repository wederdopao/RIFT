import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Rage Amplifier
registerCard({
  code: 'VEN-018',
  empower: E(6, 'Fury'),
  auras: [{ might: (g, src, t) => (src.zone === 'board' && g.isUnit(t) && t.controller === src.controller ? (src.empowered ? 2 : 1) : 0) }],
});
