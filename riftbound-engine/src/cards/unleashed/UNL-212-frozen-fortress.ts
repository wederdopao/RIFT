import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: no início da Beginning Phase de cada jogador, cause 1 a cada unidade aqui (antes de pontuar).
// Dispara no início da fase de qualquer jogador; controla a habilidade quem controla o campo, ou o jogador do turno se
// ninguém controla (190.6.a-b). O dano é do campo (fonte = o campo); as unidades vistas são as que estão aqui na resolução.
registerCard({
  code: 'UNL-212',
  triggers: [
    {
      on: 'beginStart',
      label: 'Causar 1 a cada unidade aqui',
      resolve: function* (c) {
        const i = bfIdx(c);
        if (i < 0) return;
        for (const u of c.g.unitsAtBf(i)) c.g.dealDamage(u, 1, c.self);
      },
    },
  ],
});
