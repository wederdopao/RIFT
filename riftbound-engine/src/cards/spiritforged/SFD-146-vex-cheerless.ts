import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj } from '../../engine/types';

// Enquanto estou em combate, os spells aliados custam [1][A] a menos, até um mínimo de [1], e os inimigos custam
// [1][A] a mais.
// - Desconto ao custo total, depois dos custos adicionais (Repeat, Deflect): o power pode ir a 0 e o mínimo [1] vale só
//   para a energia deste desconto (356.4.e; FAQ riftjudge #8444, #10609, #11173, #9668).
// - O aumento vale também para spells jogados escondidos (custo-base 0 → [1][A]; FAQ #10610) e uma vez por spell,
//   com ou sem Repeat (FAQ #9204).
// - "Em combate" = com a designação de atacante/defensor no combate em andamento.
const inCombat = (g: Engine, src: Obj) => src.zone === 'board' && g.inCombat(src);
registerCard({
  code: 'SFD-146',
  auras: [
    {
      costModMin: (g, src, card, p) =>
        inCombat(g, src) && src.controller === p && g.kind(card) === 'spell' ? { amount: 1, min: 1 } : undefined,
      costMod: (g, src, card, p) => (inCombat(g, src) && src.controller !== p && g.kind(card) === 'spell' ? 1 : 0),
      spellCostMod: (g, src, card, p) => {
        if (!inCombat(g, src) || g.kind(card) !== 'spell') return undefined;
        return src.controller === p ? { powerLess: 1 } : { powerMore: 1 };
      },
    },
  ],
});
