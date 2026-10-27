import { registerCard } from '../../engine/script';

// Action. Custo [2] a menos quando jogada de qualquer lugar que não seja a sua mão. Mate uma unidade num campo.
// O desconto vale ao determinar o custo total (356.4; RiftJudge #10653): do descarte (Flow, Kennen), banida (Rek'Sai),
// do deck... Efeitos que olham o custo da carta usam o impresso (FAQ #4992, #11602).
registerCard({
  code: 'SFD-164',
  keywords: { action: true },
  selfCostMod: (g, self) => (self.zone !== 'hand' ? -2 : 0),
  spell: {
    label: 'Drag Under',
    targets: [{ prompt: 'Drag Under: matar qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) yield* c.g.killG(u);
    },
  },
});
