import { registerCard } from '../../engine/script';
import { showOff, showedOff } from '../helpers';

// Hidden. Show Off uma carta com Hidden. "When you play me, if you showed off, [Add] [Rune]." — o "if" faz parte da
// condição do gatilho (383.2.a.1); gatilho que adiciona recursos resolve assim que é finalizado (429.2).
registerCard({
  code: 'RAD-103',
  keywords: { hidden: true },
  asPlayed: showOff((g, o) => !!g.kw(o).hidden, 'Show Off uma carta com Hidden'),
  triggers: [
    {
      on: 'play',
      label: '[Add] [Rune] (mostrou)',
      immediate: true,
      // o que foi mostrado vem nos dados da jogada (ev.data = c.data de quem jogou)
      cond: (c, ev) => ev.obj?.id === c.self.id && !!showedOff({ g: c.g, self: c.self, data: ev.data ?? c.self.data }),
      resolve: function* (c) { c.g.addResources(c.p, 0, ['any']); },
    },
  ],
});
