import { registerCard } from '../../engine/script';

// [Deathknell] — Se eu morri sozinha, compre 1. "Sozinha" = sem outras unidades aliadas no mesmo local no momento da
// morte; unidades aliadas que morrem junto (mesma ação) contam como presentes (regra 741.1; RiftJudge FAQ #10890).
// O "se" logo depois da condição faz parte da condição do gatilho (regra 383.2.a.1).
registerCard({
  code: 'SFD-036',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: comprar 1 se morri sozinha',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.alone,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
