import { registerCard } from '../../engine/script';

// Se você descartou uma carta neste turno, tenho Assault e Ganking.
registerCard({
  code: 'OGN-019',
  kwMod: (g, self) => (g.pl[self.controller].discardedThisTurn > 0 ? { assault: 1, ganking: true } : undefined),
});
