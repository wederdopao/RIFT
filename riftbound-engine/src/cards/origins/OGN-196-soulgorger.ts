import { registerCard } from '../../engine/script';

// Quando você me joga, você pode jogar uma unidade do seu descarte, ignorando o custo de energia.
// A unidade no descarte (zona pública) é alvo escolhido ao pôr o gatilho na pilha, e o "você pode" do começo do efeito
// também é decidido aí (regras 355.10.a e 383.3.a). Só o custo de energia é ignorado: o power é pago (356.1.b.2), e
// custos opcionais (Accelerate) e adicionais continuam (356.1.b.3; riftjudge FAQ #467) — ver Engine.playFromEffect.
registerCard({
  code: 'OGN-196',
  onPlay: [
    {
      label: 'Jogar uma unidade do descarte sem pagar energia',
      optional: 'Jogar uma unidade do seu descarte ignorando o custo de energia (o power ainda é pago)?',
      targets: [
        {
          prompt: 'Soulgorger: qual unidade do seu descarte jogar?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && c.g.isUnit(o),
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        if (!u || u.zone !== 'trash') return;
        const cost = { energy: 0, power: g.printedCost(u).power };
        if (!g.canPay(c.p, cost)) {
          g.say(`Sem power para jogar ${g.name(u)}.`, c.p);
          return;
        }
        yield* g.playFromEffect(c.p, u, cost);
      },
    },
  ],
});
