import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';
// RAD-151 Starry-Eyed Songstress — "As an additional cost to play a spell, you may exhaust me and three friendly units
// to reduce the cost of that spell by [2]." Custo adicional opcional oferecido ao jogar cada spell
// (Aura.grantOptionalCosts), não habilidade separada.
const ready = (g: Engine, p: P) => g.units().filter((u) => u.controller === p && !u.exhausted);
registerCard({
  code: 'RAD-151',
  auras: [
    {
      grantOptionalCosts: (g, src: Obj, card, p) =>
        g.kind(card) === 'spell' && src.controller === p
          ? [
              {
                label: 'Exaurir Starry-Eyed Songstress e três unidades aliadas para o spell custar [2] a menos?',
                flag: `opt:${src.id}`,
                energyMod: -2,
                canPay: (g2) => !src.exhausted && ready(g2, p).length >= 3,
                pay: function* (c) {
                  const us = ready(c.g, p);
                  if (src.exhausted || us.length < 3) return false;
                  const picks = yield* c.g.chooseObj(p, 'Starry-Eyed Songstress: exaurir quais 3 unidades aliadas?', us, 3, 3);
                  if (picks.length < 3) return false;
                  src.exhausted = true; // a lenda (fora do tabuleiro)
                  for (const u of picks) c.g.markExhausted(u, picks); // exaustão simultânea
                  return true;
                },
              },
            ]
          : undefined,
    },
  ],
});
