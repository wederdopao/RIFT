import { registerCard } from '../../engine/script';

// Jogue uma unidade do seu descarte, ignorando o custo de energia (o power ainda é pago).
// A unidade no descarte é alvo, escolhido ao jogar (regra 355.10.a). Só o custo de energia é ignorado (356.1.b.2);
// custos opcionais (Accelerate) e adicionais continuam (356.1.b.3) — ver Engine.playFromEffect.
registerCard({
  code: 'OGN-198',
  spell: {
    label: 'The Harrowing',
    targets: [
      {
        prompt: 'The Harrowing: qual unidade do seu descarte jogar?',
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
});
