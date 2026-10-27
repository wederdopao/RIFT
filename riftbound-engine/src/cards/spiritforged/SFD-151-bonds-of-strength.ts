import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Reaction. Repeat [2]. Dê +1 de Might neste turno a duas unidades aliadas.
// O texto local perdeu o "this turn" do cartão impresso ("Give two friendly units each +1 [Might] this turn." —
// texto oficial em facetofacegames.com e riftbound.cardsrealm.com). As duas unidades são alvos escolhidos ao jogar
// (regras 355.5 e 355.8): sem duas unidades aliadas não dá para jogar (como Back to Back, FAQ riftjudge #6914). Com
// Repeat, a segunda execução escolhe as suas duas unidades (podem ser as mesmas). Se só uma continuar válida, ela
// ainda recebe o +1 (359.3.e.5).
registerCard({
  code: 'SFD-151',
  keywords: { reaction: true },
  repeat: E(2),
  spell: {
    label: 'Bonds of Strength',
    targets: [{ prompt: 'Bonds of Strength: duas unidades aliadas (+1 de Might neste turno)', filter: (c, o) => o.controller === c.p, min: 2, max: 2 }],
    resolve: function* (c) {
      for (const u of c.targets[0]) c.g.giveMight(u, 1);
    },
  },
});
