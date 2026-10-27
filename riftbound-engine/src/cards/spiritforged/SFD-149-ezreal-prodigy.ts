import { registerCard } from '../../engine/script';

// Quando você me joga, descarte 1 e depois compre 2. Os custos adicionais opcionais que você paga custam [1] ou [A]
// a menos (à sua escolha).
// Custo adicional opcional = "você pode ... como custo adicional", Accelerate e Repeat; não Equip, esconder, Deflect
// nem pagamentos como o de Hard Bargain (FAQ riftjudge #8415, #5499, #1868). O desconto entra no componente assim que
// ele é somado (356.4.c) e pode zerá-lo (356.4.f; FAQ #11230). Não reduz o custo-base (FAQ #10540).
registerCard({
  code: 'SFD-149',
  onPlay: [
    {
      label: 'Descartar 1, depois comprar 2',
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
        yield* c.g.draw(c.p, 2);
      },
    },
  ],
  auras: [
    {
      addCostMod: (g, src, card, p) => (src.zone === 'board' && src.controller === p ? { either: 1 } : undefined),
    },
  ],
});
