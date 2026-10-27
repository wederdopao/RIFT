import { registerCard } from '../../engine/script';

// Seus Deathknells disparam uma vez a mais.
registerCard({
  code: 'OGN-236',
  auras: [
    {
      // Deathknells disparam antes de as cartas irem para o descarte (323.4, 808.1.d.2): se o Karthus morre junto,
      // ainda está em jogo quando elas disparam (o motor conta isso antes das mortes)
      deathknellExtra: (g, src, p) => (src.zone === 'board' && src.controller === p ? 1 : 0),
    },
  ],
});
