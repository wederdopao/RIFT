import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Caos]. Efeito (vale para a unidade equipada): quando eu conquisto, descarte 1 e depois compre 1.
// O texto de efeito é acrescentado ao da unidade equipada (regra 136.2.c): "eu" é a unidade e "você" é quem a
// controla; a unidade tem de estar no campo quando a conquista acontece (FAQ riftjudge #9486).
// O +1 de Might do equipamento vem do bônus impresso (mightBonus).
registerCard({
  code: 'SFD-124',
  equipCost: E(0, 'Chaos'),
  // texto de efeito (CardScript.equipped): c.self = a unidade equipada, c.p = quem a controla
  equipped: {
    triggers: [
      {
        on: 'conquer',
        label: 'Descartar 1, depois comprar 1',
        cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
        resolve: function* (c) {
          yield* c.g.discard(c.p, 1);
          yield* c.g.draw(c.p, 1);
        },
      },
    ],
  },
});
