import { registerCard } from '../../engine/script';

// Se um oponente estiver a 3 pontos ou menos da vitória, entro pronta.
// Unidades inimigas atordoadas aqui têm -8 de Might, até um mínimo de 1.
registerCard({
  code: 'OGN-079',
  entersReady: (g, self) => g.pl[1 - self.controller].points >= g.cfg.victoryScore - 3,
  auras: [
    {
      mightFloor: (g, src, t) =>
        src.zone === 'board' && t.zone === 'board' && t.stunned && t.controller !== src.controller && g.locEq(t.loc, src.loc)
          ? { might: -8, floor: 1 }
          : undefined,
    },
  ],
});
