import { registerCard } from '../../engine/script';

// [Hidden]. [Action]. [Stun] uma unidade. Se você jogou esta carta da mão, compre 1.
// "Da mão": a zona de onde a carta foi jogada, guardada ao jogar (antes de sair da zona, em `prepare`); jogada a partir
// de Hidden (alvo preso àquele campo, 811.1.d.2) ou por efeito de outra zona não compra.
registerCard({
  code: 'UNL-042',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Back Off',
    prepare: function* (c) {
      c.data.fromHand = c.self.zone === 'hand';
      return true;
    },
    targets: [{ prompt: 'Back Off: atordoar qual unidade?' }],
    // o "compre 1" não depende do alvo: vale mesmo se o alvo ficou ilegal (359.3.e.5-6, 359.3.e.10)
    alwaysResolve: true,
    resolve: function* (c) {
      const u = c.targets[0]?.[0];
      if (u) c.g.stun(u, c.p);
      if (c.data.fromHand) yield* c.g.draw(c.p, 1);
    },
  },
});
