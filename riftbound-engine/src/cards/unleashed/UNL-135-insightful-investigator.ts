import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Unidade 3. Quando você me joga, escolha um oponente. Ele revela a mão. Você pode pagar 2 XP para escolher uma carta da
// mão dele. Se fizer isso, ele descarta essa carta e compra 1.
// - O oponente é escolhido ao pôr o gatilho na pilha (no 1x1 só há um). O "pagar 2 XP" não é o custo-base do gatilho
//   (não está no início do efeito): é pago na resolução, à escolha de quem controla (regra 383.3.b, exemplo do próprio
//   Insightful Investigator nas Core Rules e no FAQ oficial do Unleashed). A carta escolhida não é alvo (a mão não é
//   zona pública, 355.10.a).
// - Mão vazia: não há carta para escolher, então o pagamento não é oferecido.
registerCard({
  code: 'UNL-135',
  onPlay: [
    {
      label: 'O oponente revela a mão; pagar 2 XP para ele descartar uma carta escolhida',
      resolve: function* (c) {
        const g = c.g;
        const op = (1 - c.p) as P;
        const hand = g.pl[op].hand.map((id) => g.objs[id]);
        g.say(`${g.pname(op)} revela a mão: ${hand.length ? hand.map((o) => g.name(o)).join(', ') : '(vazia)'}.`, op);
        if (!hand.length || !g.canSpendXp(c.p, 2)) return;
        if (!(yield* g.yesNo(c.p, `Insightful Investigator: pagar 2 XP (você tem ${g.pl[c.p].xp}) para escolher uma carta da mão de ${g.pname(op)}?`))) return;
        if (!(yield* g.spendXpG(c.p, 2, c.self))) return;
        const [pick] = yield* g.chooseObj(c.p, `Insightful Investigator: ${g.pname(op)} descarta qual carta?`, hand);
        if (!pick) return;
        g.discardObjs(op, [pick]);
        yield* g.draw(op, 1);
      },
    },
  ],
});
