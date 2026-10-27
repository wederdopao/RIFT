import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Action. Repeat [3]. Escolha uma unidade aliada em qualquer lugar e uma unidade inimiga num campo. Elas causam uma à
// outra dano igual ao próprio Might.
// - O dano é causado pelas unidades (regra 417.6.b.3, como Challenge), ao mesmo tempo.
// - Na repetição, os alvos podem ser outros (FAQ riftjudge #8467). Não há limpeza entre as duas execuções: unidade com
//   dano letal da primeira ainda está no tabuleiro e pode ser escolhida/causar dano na segunda (FAQ riftjudge #8767).
registerCard({
  code: 'SFD-114',
  keywords: { action: true },
  repeat: E(3),
  spell: {
    label: 'Marching Orders',
    targets: [
      { prompt: 'Marching Orders: sua unidade (em qualquer lugar)', filter: (c, o) => o.controller === c.p },
      { prompt: 'Marching Orders: unidade inimiga num campo', filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 },
    ],
    resolve: function* (c) {
      const a = c.targets[0][0];
      const b = c.targets[1][0];
      if (!a || !b) return;
      const ma = Math.max(0, c.g.might(a));
      const mb = Math.max(0, c.g.might(b));
      c.g.dealDamage(b, ma, a, { byUnit: true });
      c.g.dealDamage(a, mb, b, { byUnit: true });
    },
  },
});
