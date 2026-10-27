import { registerCard } from '../../engine/script';

// [Deathknell] Se eu não morri sozinha, compre 1. (Não estava sozinha se havia outras unidades aliadas aqui.)
// - "Sozinha" olha só as unidades aliadas no mesmo local no momento da morte; inimigas não contam (regra 741.1;
//   RiftJudge #10102, #373). Aliadas que morrem junto contam como presentes (RiftJudge #10890; ev.alone do killG).
// - O "se" logo depois da condição faz parte da condição do gatilho (383.2.a.1), como no Lonely Poro (SFD-036).
registerCard({
  code: 'UNL-156',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: comprar 1 se não morri sozinha',
      cond: (c, ev) => ev.obj?.id === c.self.id && !ev.alone,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
