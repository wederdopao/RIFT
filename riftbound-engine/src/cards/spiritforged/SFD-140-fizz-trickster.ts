import { registerCard } from '../../engine/script';

// Quando você me joga, você pode jogar um spell do seu descarte com custo de energia de no máximo [3], ignorando o
// custo de energia. Depois recicle-o. (O power ainda é pago.)
// - "Você pode" no início: decidido ao pôr o gatilho na pilha (383.3.a). O spell está no descarte (zona pública):
//   é alvo, escolhido nessa hora (355.10.a); o limite olha o custo de energia impresso (FAQ riftjudge #11555).
// - Ignorar o custo de energia: só a energia-base vira 0 (356.1.b.2); power, Deflect e Repeat continuam (FAQ #9667).
//   O jogador pode recusar pagar o power (444.2.a): aí o spell não é jogado.
// - "Depois recicle-o": substituição ao sair da pilha, inclusive se for anulado (regra 390.3.a).
// - O spell pode escolher o próprio Fizz (FAQ #9320).
registerCard({
  code: 'SFD-140',
  onPlay: [
    {
      label: 'Jogar um spell do descarte (custo de energia até 3)',
      optional: 'Jogar um spell do seu descarte com custo de energia até [3], ignorando o custo de energia?',
      targets: [
        {
          prompt: 'Fizz: jogar qual spell do seu descarte?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && o.zone === 'trash' && c.g.kind(o) === 'spell' && c.g.data(o).energy <= 3,
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const card = c.targets[0][0];
        if (!card) return;
        const cost = { energy: 0, power: g.printedCost(card).power };
        if (!g.canPay(c.p, g.effectCost(c.p, card, cost), true)) return g.say(`Fizz: sem recursos para pagar ${g.name(card)}.`, c.p);
        if (cost.power.length && !(yield* g.yesNo(c.p, `Fizz: pagar o power de ${g.name(card)} para jogá-lo?`))) return;
        yield* g.playFromEffect(c.p, card, cost, undefined, { recycleAfter: true });
      },
    },
  ],
});
