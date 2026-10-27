import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Lord Broadmane. Ambush. Quando você me joga, dê [Assault] às suas outras unidades aqui neste turno.
// - "Aqui" e "suas outras unidades" são vistos na resolução (referentes; patch notes do Unleashed). Se eu já saí do
//   tabuleiro, "aqui" é o último local em que estive (o local onde fui jogado).
registerCard({
  code: 'UNL-012',
  keywords: { ambush: true },
  onPlay: [
    {
      label: 'Dar [Assault] às suas outras unidades aqui neste turno',
      resolve: function* (c) {
        const g = c.g;
        const here: Loc | undefined = c.self.zone === 'board' ? c.self.loc : c.ev?.loc;
        if (!here) return;
        const us = g.unitsAt(here).filter((u) => u.controller === c.p && u.id !== c.self.id);
        for (const u of us) g.giveKw(u, { assault: 1 });
        if (us.length) g.say(`${us.map((u) => g.name(u)).join(', ')} recebe(m) [Assault] neste turno.`, c.p);
      },
    },
  ],
});
