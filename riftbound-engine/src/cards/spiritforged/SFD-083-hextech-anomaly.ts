import { registerCard } from '../../engine/script';
import { DOMAINS, type Cost } from '../../engine/types';

// [Tap]: [Reaction] — Pague qualquer quantidade de [Rune] para [Add] essa quantidade de energia.
// - Habilidade de [Add]: resolve na hora, sem pilha (429.2). Troca power por energia, 1 por 1, e pode ser usada no meio
//   de um pagamento (FAQ riftjudge #164): o planejador automático do motor também a usa (adds.convert).
// - "Qualquer quantidade" (inclusive 0) é escolhida ao ativar; o power vem do pool, de runas recicladas ou de Gold.
const powerCost = (n: number): Cost => ({ energy: 0, power: Array.from({ length: n }, () => [...DOMAINS]) });
registerCard({
  code: 'SFD-083',
  activated: [
    {
      label: 'Pagar power para adicionar a mesma quantidade de energia',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      adds: { convert: 'powerToEnergy' },
      prepare: function* (c) {
        const g = c.g;
        let max = 0;
        while (max < 40 && g.canPay(c.p, powerCost(max + 1))) max++;
        const opts = Array.from({ length: max + 1 }, (_, n) => ({ id: String(n), label: `${n} power → ${n} de energia` }));
        const [x] = yield* g.ask(c.p, 'choose', 'Hextech Anomaly: quanto power pagar?', opts.reverse());
        c.data.x = Number(x);
        return true;
      },
      cost: (c) => powerCost(c.data.x || 0),
      resolve: function* (c) {
        const n = c.data.x || 0;
        if (n) c.g.addResources(c.p, n);
      },
    },
  ],
});
