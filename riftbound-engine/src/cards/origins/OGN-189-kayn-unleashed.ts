import { registerCard } from '../../engine/script';

// Ganking. Se eu me movi duas vezes neste turno, não recebo dano.
registerCard({
  code: 'OGN-189',
  keywords: { ganking: true },
  noDamage: (g, self) => g.movesThisTurn(self) >= 2,
});
