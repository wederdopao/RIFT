import { registerCard } from '../../engine/script';

// [Deflect]. [Tank]. Não causo dano de combate.
// Participo do combate, mas contribuo 0 de dano (RiftJudge #10827; 462.2.a).
registerCard({
  code: 'UNL-171',
  keywords: { deflect: 1, tank: true },
  noCombatDamage: () => true,
});
