import { registerCard } from '../../engine/script';

// Accelerate. Quando eu ataco, você pode mover quantas fichas de unidade suas quiser para este campo.
// - "Você pode" no começo: decidido ao pôr o gatilho na pilha (383.3.a). As fichas são alvos escolhidos aí também
//   ("pode [ação] em um número de objetos": 355.12), quantas quiser, inclusive nenhuma (355.13), de qualquer local.
// - "Este campo" é o meu campo na resolução (359.3.f.2): se eu saí do campo (voltei para a mão ou para a base) antes, as
//   fichas não se movem (RiftJudge #2127, #9685, #11149, #11183). Campo vazio também serve (FAQ #9264).
registerCard({
  code: 'SFD-177',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'attack',
      label: 'Mover fichas de unidade suas para este campo',
      optional: 'Mover fichas de unidade suas para este campo?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Azir: quais fichas de unidade suas vêm para este campo?',
          min: 0,
          max: 99,
          filter: (c, o) => o.token && o.controller === c.p && !c.g.locEq(o.loc, c.self.loc),
        },
      ],
      resolve: function* (c) {
        const i = c.self.zone === 'board' ? c.g.bfIndex(c.self) : -1;
        if (i < 0) return;
        const us = c.targets[0].filter((u) => u.zone === 'board' && u.controller === c.p);
        // moveUnitsG (novo, UNL order): custo aplicado ao movimento, se houver (Mageseeker Investigator; 204.4)
        if (us.length) yield* c.g.moveUnitsG(us, { t: 'bf', i }, c.p);
      },
    },
  ],
});
