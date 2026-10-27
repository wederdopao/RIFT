import { registerCard } from '../../engine/script';

// Ganking. Quando eu conquisto, você pode jogar do seu descarte um spell com custo de energia menor que seus pontos,
// sem pagar a energia (o power ainda é pago). Depois recicle-o.
// - "Você pode" no início do efeito: decidido ao pôr o gatilho na pilha (regra 383.3.a).
// - O spell está no descarte (zona pública): é alvo, escolhido ao pôr na pilha (regras 355.10.a e 402.2); a restrição
//   "custo de energia menor que seus pontos" vale ao escolher e é checada de novo na resolução (alvo ilegal não é afetado).
// - "Custo de energia" é o impresso (regra 206). Sem pagar a energia: só a energia-base vira 0 (356.1.b.2); power,
//   Deflect e custos adicionais continuam. O jogador pode não pagar o power (regra 444.2.a): aí a carta não é jogada.
// - "Depois recicle-o": substituição ao sair da pilha (regra 390.3.a).
registerCard({
  code: 'OGN-112',
  keywords: { ganking: true },
  triggers: [
    {
      on: 'conquer',
      label: 'Jogar um spell do descarte',
      optional: 'Jogar um spell do seu descarte com custo de energia menor que seus pontos, sem pagar a energia?',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      targets: [
        {
          prompt: "Kai'Sa: jogar qual spell do seu descarte?",
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && o.zone === 'trash' && c.g.kind(o) === 'spell' && c.g.data(o).energy < c.g.pl[c.p].points,
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const card = c.targets[0][0];
        if (!card) return;
        const cost = { energy: 0, power: g.printedCost(card).power };
        if (!g.canPay(c.p, cost, true)) return g.say(`Kai'Sa: sem recursos para pagar o power de ${g.name(card)}.`, c.p);
        if (cost.power.length && !(yield* g.yesNo(c.p, `Kai'Sa: pagar ${cost.power.length} power para jogar ${g.name(card)}?`))) return;
        yield* g.playFromEffect(c.p, card, cost, undefined, { recycleAfter: true });
      },
    },
  ],
});
