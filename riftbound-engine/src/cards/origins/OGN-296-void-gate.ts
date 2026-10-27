import { registerCard } from '../../engine/script';
// Campo: spells e habilidades causam 1 de Bonus Damage a unidades aqui.
registerCard({
  code: 'OGN-296',
  auras: [{ bonusDamage: (g, src, u) => (g.bfIndex(u) >= 0 && g.bfIndex(u) === g.bfOf(src) ? 1 : 0) }],
});
