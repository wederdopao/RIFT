import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quando um showdown começa aqui, você pode pagar [1] para fazer [Predict], depois revelar a carta do topo do seu Main
// Deck. Se for um spell, compre-a. (Texto com a errata do Vendetta.)
// - "Showdown começa aqui": evento 'showdownStart' (344; vale também para o showdown de combate, 464.2.b). Uma disputa
//   que vira combate no meio de um showdown já começado não é um showdown novo.
// - "Você pode pagar [1] para ...": o jogador escolhe pôr na pilha e o [1] é pago ao finalizar (patch notes do Unleashed,
//   "May" Triggered Abilities and Extra Conditions).
// - Revelar o topo é g.revealTop (Void Hatchling, Nocturne, "As I'm revealed"). "Compre-a": é a carta do topo.
registerCard({
  code: 'UNL-079',
  triggers: [
    {
      on: 'showdownStart',
      label: 'Pagar [1]: Predict, revelar o topo e comprar se for spell',
      optional: 'pagar [1] para fazer Predict e revelar a carta do topo (compra se for spell)?',
      cond: (c, ev) => c.g.bfIndex(c.self) >= 0 && ev.bf === c.g.bfIndex(c.self),
      cost: E(1),
      resolve: function* (c) {
        const g = c.g;
        yield* g.predict(c.p, 1);
        const [o] = yield* g.revealTop(c.p, 1, c.p);
        if (!o || o.zone !== 'mainDeck' || g.pl[c.p].mainDeck[0] !== o.id) return;
        if (g.kind(o) === 'spell') yield* g.draw(c.p, 1);
      },
    },
  ],
});
