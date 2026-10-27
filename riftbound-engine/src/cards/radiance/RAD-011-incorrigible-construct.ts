import { registerCard } from '../../engine/script';
import { showOff, showedOff } from '../helpers';

// Show Off um Mech. Entro pronta se você fez Show Off.
registerCard({
  code: 'RAD-011',
  asPlayed: showOff((g, o) => g.hasTag(o, 'Mech'), 'Show Off um Mech'),
  entersReady: (g, self) => !!showedOff({ g, self }),
});
