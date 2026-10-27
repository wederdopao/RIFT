import { registerCard } from '../../engine/script';

// [Ambush]. Quando eu ataco, atordoe ([Stun]) uma unidade inimiga aqui.
// - O alvo é escolhido ao pôr o gatilho na pilha; "aqui" é o meu campo, verificado de novo na resolução.
// - Jogada com Ambush num combate em que você ataca, ela entra como atacante e o gatilho dispara (RiftJudge #10034,
//   #11475); jogada pelo defensor, entra como defensora e não dispara (#10724).
registerCard({
  code: 'UNL-176',
  keywords: { ambush: true },
  triggers: [
    {
      on: 'attack',
      label: 'Atordoar uma unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Vi, Peacekeeper: atordoar qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.self.zone === 'board' && c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.stun(u, c.p);
      },
    },
  ],
});
