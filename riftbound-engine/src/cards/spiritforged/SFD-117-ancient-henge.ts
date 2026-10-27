import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// [Tap]: [Reaction] — pague qualquer quantidade de energia para adicionar essa quantidade de [Rune] (power de qualquer
// domínio). Habilidade de [Add]: resolve na hora, sem pilha (regra 429.2). A quantidade é escolhida ao ativar; no
// pagamento automático, o planejador do motor escolhe a quantidade (adds.convert).
registerCard({
  code: 'SFD-117',
  activated: [
    {
      label: 'Pagar energia para adicionar o mesmo tanto de power',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      adds: { convert: 'energyToPower' }, // o pagamento automático também usa (com a quantidade que precisar)
      prepare: function* (c) {
        const g = c.g;
        let max = 0;
        while (max < 30 && g.canPay(c.p, E(max + 1))) max++;
        const opts = Array.from({ length: max + 1 }, (_, n) => ({ id: String(n), label: `${n} de energia → ${n} power` }));
        const [x] = yield* g.ask(c.p, 'choose', 'Ancient Henge: pagar quanta energia?', opts.reverse());
        c.data.x = Number(x);
        return true;
      },
      cost: (c) => E(c.data.x || 0),
      resolve: function* (c) {
        const n = c.data.x || 0;
        if (n) c.g.addResources(c.p, 0, Array.from({ length: n }, () => 'any' as const));
      },
    },
  ],
});
