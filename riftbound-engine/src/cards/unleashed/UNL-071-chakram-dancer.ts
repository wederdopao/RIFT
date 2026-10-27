import { registerCard } from '../../engine/script';

// [Ambush]. Quando você me joga, dê [Shield] às suas outras unidades aqui neste turno.
// "Aqui" = o meu local na resolução (359.3.f.2); se saí do tabuleiro, não tenho local e nada acontece.
registerCard({
  code: 'UNL-071',
  keywords: { ambush: true },
  onPlay: [
    {
      label: 'Dar [Shield] às suas outras unidades aqui',
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board' || !c.self.loc) return;
        const us = g.unitsAt(c.self.loc).filter((u) => u.controller === c.p && u.id !== c.self.id);
        for (const u of us) g.giveKw(u, { shield: 1 });
        if (us.length) g.say(`${us.map((u) => g.name(u)).join(', ')} ganha(m) [Shield] neste turno.`, c.p);
      },
    },
  ],
});
