import { registerCard } from '../../engine/script';

// Quando você defende num campo de batalha, você pode me mover para lá.
// "Você defende" = você recebe a designação de defensor quando um combate começa (regra 464.2.c); um showdown sem
// combate não conta (FAQ riftjudge #11081). "Você pode" no início: decidido ao pôr o gatilho na pilha (383.3.a).
// Se eu já estou lá, mover não faz nada (355.4.a), então o gatilho nem pergunta.
registerCard({
  code: 'SFD-126',
  triggers: [
    {
      on: 'defend',
      label: 'Mover-me para o campo defendido',
      optional: 'Mover Loyal Pup para o campo de batalha que você está defendendo?',
      cond: (c, ev) => !!ev.playerLevel && ev.player === c.p && c.g.bfIndex(c.self) !== ev.bf,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.moveUnits([c.self], { t: 'bf', i: c.ev!.bf }, c.p);
      },
    },
  ],
});
