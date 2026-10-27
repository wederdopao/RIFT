import { registerCard } from '../../engine/script';
// Action: dê +3 de Might a uma unidade aliada neste turno. Depois, escolha uma unidade inimiga.
// Elas causam uma à outra dano igual ao próprio Might.
// As duas unidades são alvos e são escolhidas ao jogar (regras 355.5 e 355.7; ruling FAQ #6318 em app.riftjudge.com:
// alvos são declarados ao pôr na pilha). Diferente de Dragon's Rage, aqui não há "Then do this" (gatilho reflexivo).
registerCard({
  code: 'OGS-008',
  keywords: { action: true },
  spell: {
    label: "Gentlemen's Duel",
    targets: [
      { prompt: "Gentlemen's Duel: sua unidade (+3 de Might)", filter: (c, o) => o.controller === c.p },
      { prompt: "Gentlemen's Duel: unidade inimiga", filter: (c, o) => o.controller !== c.p },
    ],
    resolve: function* (c) {
      const a = c.targets[0][0];
      const b = c.targets[1][0];
      if (!a) return;
      c.g.giveMight(a, 3);
      if (!b) return;
      const ma = Math.max(0, c.g.might(a));
      const mb = Math.max(0, c.g.might(b));
      // o dano é causado pelas unidades, não pelo spell (regra 417.6.b.3)
      c.g.dealDamage(b, ma, a, { byUnit: true });
      c.g.dealDamage(a, mb, b, { byUnit: true });
    },
  },
});
