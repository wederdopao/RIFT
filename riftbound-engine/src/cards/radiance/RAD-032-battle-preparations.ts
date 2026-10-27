import { registerCard } from '../../engine/script';
import { T, showOff, showedOff } from '../helpers';

// Reaction. Show Off um gear. Dê +2 de Might a uma unidade neste turno. Se fez Show Off, prepare até 2 runas.
registerCard({
  code: 'RAD-032',
  keywords: { reaction: true },
  asPlayed: showOff((g, o) => g.isGear(o), 'Show Off um gear'),
  spell: {
    label: 'Battle Preparations',
    targets: [T.anyUnit('Battle Preparations: +2 de Might em qual unidade?')],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (u) g.giveMight(u, 2);
      if (showedOff(c)) for (const r of g.runesOf(c.p).filter((x) => x.exhausted).slice(0, 2)) g.ready(r, c.p);
    },
  },
});
