import { registerCard } from '../../engine/script';
import { DOMAINS, type Cost } from '../../engine/types';
// Action. Pague qualquer quantidade de [A] (power de qualquer domínio — símbolo arco-íris no texto oficial) para
// causar essa quantidade de dano a todas as unidades inimigas num campo de batalha.
// O campo é alvo (escolhido ao jogar); a quantidade é escolhida e paga na resolução, não ao jogar (ruling FAQ #5521
// em app.riftjudge.com). Não é pagamento para jogar spell: [Add] "só para spells" (Kai'Sa) não ajuda.
const powerCost = (n: number): Cost => ({ energy: 0, power: Array.from({ length: n }, () => [...DOMAINS]) });
registerCard({
  code: 'OGN-268',
  keywords: { action: true },
  spell: {
    label: 'Bullet Time',
    targets: [{ prompt: 'Bullet Time: qual campo de batalha?', kind: 'battlefield' }],
    resolve: function* (c) {
      const g = c.g;
      const bf = c.targets[0][0];
      if (!bf) return;
      let max = 0;
      while (max < 60 && g.canPay(c.p, powerCost(max + 1))) max++;
      if (max === 0) {
        g.say('Bullet Time: nenhum power para pagar.', c.p);
        return;
      }
      const opts = Array.from({ length: max + 1 }, (_, n) => ({ id: String(n), label: n === 0 ? 'Não pagar' : `Pagar ${n} power` }));
      const [k] = yield* g.ask(c.p, 'choose', 'Bullet Time: quanto power pagar? (1 de dano por power)', opts);
      const n = Number(k);
      if (!n) return;
      yield* g.payG(c.p, powerCost(n));
      for (const u of g.unitsAtBf(g.bfOf(bf)).filter((x) => x.controller !== c.p)) g.dealDamage(u, n, c.self);
    },
  },
});
