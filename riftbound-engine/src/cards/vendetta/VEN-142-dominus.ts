import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// VEN-142 Dominus
// "This turn, double a unit's Might and give it "[Rune][Rune]: Ready me."" — +Might igual ao Might atual neste turno e a
// habilidade ativada concedida (g.grantActivated: `activated[0]` deste script), usável quantas vezes der neste turno.
registerCard({
  code: 'VEN-142',
  keywords: { action: true },
  spell: {
    label: 'Dominus',
    targets: [{ prompt: 'Dominus: dobrar o Might de qual unidade?' }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      g.giveMight(u, Math.max(0, g.might(u)), 'turn');
      g.grantActivated(u, 'VEN-142', 0, 'turn');
      g.say(`${g.name(u)} ganha "[Rune][Rune]: Ready me" neste turno.`, c.p);
    },
  },
  // habilidade concedida pelo Dominus (c.self = a unidade que a ganhou)
  activated: [
    {
      label: '[Rune][Rune]: Ready me (Dominus)',
      cost: E(0, 'any', 'any'),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.ready(c.self, c.p);
      },
    },
  ],
});
