import { registerCard } from '../../engine/script';
import { E, chooseTokenLoc } from '../helpers';

// Hidden. Jogue uma ficha Sand Soldier de 2 de Might. Então faça isto: você pode pagar [Order] para prepará-la.
// - Jogada normal: a ficha vai para a sua base ou um campo que você controla (355.2.a), à sua escolha.
// - Jogada a partir de Hidden: a ficha tem de ir para aquele campo (regra 811.1.d.3; RiftJudge #9273, #9517, #9957).
// - O pagamento é escolhido na resolução ("Then do this", errata de 03/04/2026). Se a ficha já entrou pronta
//   (Renata Glasc, Industrialist) ou não pôde ser jogada, não há o que preparar.
registerCard({
  code: 'SFD-154',
  keywords: { hidden: true },
  spell: {
    label: 'Guards!',
    resolve: function* (c) {
      const g = c.g;
      const loc = c.hiddenBf !== undefined ? ({ t: 'bf', i: c.hiddenBf } as const) : yield* chooseTokenLoc(c, 'Guards!: onde jogar a ficha Sand Soldier?');
      if (!loc) return;
      // caça UNL: com Zilean, Time Mage, a ficha a mais herda o "então faça isto" (regra 375; FAQ #9917, #11565): um
      // pagamento de [Order] prepara as duas
      const toks = (yield* g.playTokensG('TOK-SAND', c.p, loc)).filter((t) => t.zone === 'board' && t.exhausted);
      if (!toks.length) return;
      const cost = E(0, 'Order');
      if (!g.canPay(c.p, cost)) return;
      if (!(yield* g.yesNo(c.p, 'Guards!: pagar [Order] para preparar o Sand Soldier?'))) return;
      yield* g.payG(c.p, cost);
      for (const tok of toks) g.ready(tok, c.p);
    },
  },
});
