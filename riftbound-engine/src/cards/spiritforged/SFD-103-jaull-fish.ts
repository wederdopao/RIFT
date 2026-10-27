import { registerCard } from '../../engine/script';

// Accelerate. Custo [2] menor para cada unidade Mighty sua (5+ de Might).
registerCard({
  code: 'SFD-103',
  keywords: { accelerate: true },
  selfCostMod: (g, self, p) => -2 * g.units().filter((u) => u.controller === p && g.isMighty(u)).length,
});
