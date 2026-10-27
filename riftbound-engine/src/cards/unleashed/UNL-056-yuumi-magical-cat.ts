import { registerCard } from '../../engine/script';

// Quando eu ataco ou defendo, dê a uma das suas outras unidades aqui +3 [Might] e [Tank] neste turno.
// A unidade é alvo, escolhida ao pôr o gatilho na pilha (355.10); "aqui" é conferido de novo na resolução (359.3.f.2,
// filtro do alvo): se ela saiu do meu campo, erra o alvo.
registerCard({
  code: 'UNL-056',
  triggers: [
    {
      on: ['attack', 'defend'],
      label: '+3 de Might e Tank em outra unidade sua aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Yuumi, Magical Cat: dar +3 e Tank a qual outra unidade sua aqui?',
          filter: (c, o) => o.controller === c.p && o.id !== c.self.id && c.self.zone === 'board' && c.g.locEq(o.loc, c.self.loc),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u) return;
        c.g.giveMight(u, 3);
        c.g.giveKw(u, { tank: true });
      },
    },
  ],
});
