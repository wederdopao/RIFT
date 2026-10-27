import { registerCard } from '../../engine/script';

// Eu tenho +1 de Might para cada unidade sua com [Temporary] no meu campo de batalha (eu mesma conto, se tiver
// Temporary). Na base não estou num campo: +0.
registerCard({
  code: 'UNL-076',
  mightMod: (g, self) => {
    const i = g.bfIndex(self);
    if (i < 0) return 0;
    return g.unitsAtBf(i, self.controller).filter((u) => g.kw(u).temporary).length;
  },
});
