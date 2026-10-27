import { registerCard } from '../../engine/script';

// Outras unidades aliadas entram prontas. Só unidades: uma ficha de gear (Gold "exhausted") não é afetada.
registerCard({
  code: 'OGN-011',
  auras: [{ enterReady: (g, src, unit) => src.zone === 'board' && g.isUnit(unit) && unit.id !== src.id && unit.controller === src.controller }],
});
