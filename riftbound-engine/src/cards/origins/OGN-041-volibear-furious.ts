import { registerCard } from '../../engine/script';

// Deflect 2. Quando eu ataco, cause 5 de dano dividido entre quantas unidades inimigas daqui você quiser.
// Os alvos ("qualquer número", inclusive zero: regra 355.13) são escolhidos ao finalizar; a divisão do dano é
// decidida na resolução, com pelo menos 1 em cada alvo (regras 355.14.b, 355.14.e e 355.14.f).
registerCard({
  code: 'OGN-041',
  keywords: { deflect: 2 },
  triggers: [
    {
      on: 'attack',
      label: '5 de dano dividido entre unidades inimigas aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      // até 5 alvos (o dano inicial), ou mais com Bonus Damage, que soma no total a dividir (355.14.c, 715.3)
      targets: (c) => [
        {
          prompt: 'Volibear: dividir 5 de dano entre quais unidades inimigas aqui?',
          filter: (cc, o) => o.controller !== cc.p && cc.g.bfIndex(o) >= 0 && cc.g.bfIndex(o) === cc.g.bfIndex(cc.self),
          min: 0, // "quantas quiser" (355.13)
          max: c.g.splitMaxTargets(c.self, 5),
        },
      ],
      resolve: function* (c) {
        yield* c.g.dealSplit(c.p, c.self, 5, c.targets[0], 'Volibear');
      },
    },
  ],
});
