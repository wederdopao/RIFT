import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Ctx } from '../../engine/script';

// Reaction. Repeat [2]. Anule um spell a menos que o controlador dele pague [2].
// Na resolução o controlador do spell escolhe se paga (pode recusar mesmo podendo: regra 444.2; FAQ riftjudge #710);
// se não pagar, o spell é anulado. Com Repeat, a segunda execução cobra de novo (o mesmo spell ou outro escolhido:
// FAQ #3433, #710). Pagar [2] aqui não é custo adicional (FAQ #5499).
function* bargain(c: Ctx) {
  const g = c.g;
  const s = c.targets[0][0];
  const item = s && g.chain.find((it) => it.cardId === s.id);
  if (!item) return;
  const q = item.controller;
  const cost = E(2);
  if (g.canPay(q, cost) && (yield* g.yesNo(q, `Hard Bargain: pagar [2] para ${g.name(s)} não ser anulado?`))) {
    yield* g.payG(q, cost);
    g.say(`${g.pname(q)} paga [2] e ${g.name(s)} continua na pilha.`, q);
    return;
  }
  g.counter(item);
}

registerCard({
  code: 'SFD-136',
  keywords: { reaction: true },
  repeat: E(2),
  spell: {
    label: 'Hard Bargain',
    targets: [{ prompt: 'Hard Bargain: anular qual spell (a menos que o controlador pague [2])?', kind: 'spell' }],
    resolve: bargain,
  },
});
