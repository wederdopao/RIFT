import { registerCard } from '../../engine/script';
// VEN-164 Sandswept Tomb
registerCard({
  code: 'VEN-164',
  auras: [
    {
      spellCostMod: (g, src, card, p, chosen) => {
        const i = g.bfOf(src);
        if (i < 0 || !chosen || g.kind(card) !== 'spell') return undefined;
        return chosen.some((o) => g.isUnit(o) && o.controller === p && g.bfIndex(o) === i) ? { powerLess: 1 } : undefined;
      },
    },
  ],
});
