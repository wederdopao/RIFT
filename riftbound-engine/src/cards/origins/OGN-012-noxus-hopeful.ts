import { registerCard } from '../../engine/script';

// Legion: custo 2 a menos (se você jogou outra carta neste turno).
registerCard({
  code: 'OGN-012',
  selfCostMod: (g, self, p) => (g.legion(self, p) ? -2 : 0),
});
