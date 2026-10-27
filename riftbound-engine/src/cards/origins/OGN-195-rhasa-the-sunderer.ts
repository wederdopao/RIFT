import { registerCard } from '../../engine/script';

// Custo 1 a menos para cada carta no seu descarte.
registerCard({
  code: 'OGN-195',
  selfCostMod: (g, self, p) => -g.pl[p].trash.length,
});
