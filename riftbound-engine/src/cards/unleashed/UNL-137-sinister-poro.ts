import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Unidade 1. Quando eu ataco, você pode pagar [1] para mover uma unidade inimiga aqui para a base dela.
// - "you may pay [1] to ..." = "you may" + custo dentro das instruções: o jogador escolhe ao pôr o gatilho na pilha e
//   paga [1] nessa hora (383.3.a, 383.3.b; patch notes do Unleashed). A unidade inimiga é alvo, escolhida também nessa
//   hora entre as que estão no campo do ataque (355.5.b); o custo não é alvo (355.10.c.1).
// - Na resolução ela tem de continuar inimiga e "aqui" (no campo do Poro, 359.3.f); o destino é a base do controlador dela.
registerCard({
  code: 'UNL-137',
  triggers: [
    {
      on: 'attack',
      label: 'Pagar [1] para mover uma unidade inimiga aqui para a base dela',
      optional: 'Pagar [1] para mover uma unidade inimiga daqui para a base dela?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      cost: E(1),
      targets: [
        {
          prompt: 'Sinister Poro: mover qual unidade inimiga aqui para a base dela?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && u.zone === 'board') c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
