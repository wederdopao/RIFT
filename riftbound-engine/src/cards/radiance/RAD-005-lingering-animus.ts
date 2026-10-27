import { registerCard } from '../../engine/script';

// Entro pronta se uma unidade ou gear aliado morreu neste turno.
registerCard({
  code: 'RAD-005',
  entersReady: (g, self) => {
    const s = g.pl[self.controller];
    return (s.unitDeaths || 0) + (s.gearDeaths || 0) > 0;
  },
});
