import { registerCard } from '../../engine/script';

// Tank. Tenho +1 de Might para cada unidade aliada com Buff no meu campo de batalha.
registerCard({
  code: 'OGN-240',
  keywords: { tank: true },
  mightMod: (g, self) => {
    const i = g.bfIndex(self);
    if (i < 0) return 0;
    return g.unitsAtBf(i, self.controller).filter((u) => u.buffs > 0).length;
  },
});
