import { registerCard } from '../../engine/script';

// Cause 6 de dano a cada uma de até duas unidades.
// "Até duas": pode escolher 0, 1 ou 2 alvos; com 0, o spell é jogado sem alvo (regra 355.13). Com um alvo que ficou
// ilegal, o dano ainda vai para o outro (regra 359.3.e.8).
registerCard({
  code: 'OGN-105',
  spell: {
    label: 'Singularity',
    targets: [{ prompt: 'Singularity: 6 de dano em até duas unidades', min: 0, max: 2 }],
    resolve: function* (c) {
      for (const u of c.targets[0]) c.g.dealDamage(u, 6, c.self);
    },
  },
});
