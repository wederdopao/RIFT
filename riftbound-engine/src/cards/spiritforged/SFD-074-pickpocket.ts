import { registerCard } from '../../engine/script';

// Quando você me joga, você pode matar um gear com custo de energia até [1]. Se fizer, jogue uma ficha de gear Gold
// exaurida.
// - "Você pode" no início: decidido ao pôr na pilha (383.3.a); o gear é alvo, escolhido nessa hora.
// - Custo de energia = custo impresso (regra 206); fichas têm custo 0 (185.3.a.1), então um Gold serve.
// - "Se fizer": só se o gear morreu (uma substituição de morte faz a instrução não acontecer).
registerCard({
  code: 'SFD-074',
  onPlay: [
    {
      label: 'Matar um gear de custo até 1 e jogar um Gold',
      optional: 'matar um gear com custo de energia até 1?',
      targets: [
        {
          prompt: 'Pickpocket: matar qual gear (custo de energia até 1)?',
          kind: 'gear',
          filter: (c, o) => c.g.data(o).energy <= 1,
        },
      ],
      resolve: function* (c) {
        const gear = c.targets[0][0];
        if (!gear) return;
        const dead = yield* c.g.killG(gear);
        if (dead.length) c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
