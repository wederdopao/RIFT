import { registerCard } from '../../engine/script';

// [Deathknell] Cause 4 de dano a uma unidade inimiga (inimiga de quem me controlava ao morrer; alvo escolhido ao pôr o
// gatilho na pilha). Sem unidade inimiga, o gatilho não vai para a pilha.
registerCard({
  code: 'UNL-067',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: 4 de dano a uma unidade inimiga',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [{ prompt: 'Ruined Rex: 4 de dano em qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 4, c.self);
      },
    },
  ],
});
