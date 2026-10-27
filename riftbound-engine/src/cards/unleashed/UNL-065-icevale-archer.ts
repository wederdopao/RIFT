import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quando eu ataco, você pode pagar [1] para dar -1 de Might a uma unidade aqui neste turno.
// Gatilho com "você pode" e custo dentro da instrução: o jogador escolhe se põe na pilha e paga o [1] ao finalizar
// (patch notes do Unleashed: "May" Triggered Abilities and Extra Conditions; 383.3.b.1). "Aqui" = o campo onde eu
// ataco; a unidade (qualquer uma, aliada ou inimiga) é alvo escolhido ao pôr na pilha (355.10).
registerCard({
  code: 'UNL-065',
  triggers: [
    {
      on: 'attack',
      label: 'Pagar [1]: -1 de Might a uma unidade aqui',
      optional: 'pagar [1] para dar -1 de Might a uma unidade aqui neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      cost: E(1),
      targets: [
        {
          prompt: 'Icevale Archer: dar -1 de Might a qual unidade aqui?',
          filter: (c, o) => c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -1);
      },
    },
  ],
});
