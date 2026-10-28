import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Ol' Poro
registerCard({
  code: 'VEN-029',
  // "on your first, second or third turns": só nos turnos do próprio jogador (no turno do oponente não há restrição)
  canPlay: (g, self, p) => g.active !== p || (g.pl[p].turns || 0) >= 4,
});
