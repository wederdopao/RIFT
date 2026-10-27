import { registerCard } from '../../engine/script';
// Campo: aumenta em 1 os pontos necessários para vencer a partida.
registerCard({
  code: 'OGN-276',
  bfSetup: (g) => {
    g.cfg.victoryScore += 1;
    g.say(`Aspirant's Climb: são necessários ${g.cfg.victoryScore} pontos para vencer.`);
  },
  // novo (UNL): substituído por uma ficha (438), o aumento deixa de valer
  bfTeardown: (g) => {
    g.cfg.victoryScore -= 1;
    g.say(`Aspirant's Climb saiu: são necessários ${g.cfg.victoryScore} pontos para vencer.`);
  },
});
