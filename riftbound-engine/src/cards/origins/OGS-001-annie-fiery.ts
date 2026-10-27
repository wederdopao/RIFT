import { registerCard } from '../../engine/script';
// Seus spells e habilidades causam 1 de Bonus Damage.
// Dano dividido: o bônus soma uma vez no total a dividir (regra 715.3; o motor faz isso em dealSplit).
registerCard({
  code: 'OGS-001',
  auras: [{ bonusDamage: (g, src, u, source, by) => (by === src.controller ? 1 : 0) }],
});
