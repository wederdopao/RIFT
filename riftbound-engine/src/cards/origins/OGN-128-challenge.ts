import { registerCard } from '../../engine/script';

// Action: escolha uma unidade aliada e uma inimiga. Cada uma causa à outra dano igual ao próprio Might.
registerCard({
  code: 'OGN-128',
  keywords: { action: true },
  spell: {
    label: 'Challenge',
    targets: [
      { prompt: 'Challenge: sua unidade', filter: (c, o) => o.controller === c.p },
      { prompt: 'Challenge: unidade inimiga', filter: (c, o) => o.controller !== c.p },
    ],
    resolve: function* (c) {
      const a = c.targets[0][0];
      const b = c.targets[1][0];
      if (!a || !b) return;
      const ma = Math.max(0, c.g.might(a));
      const mb = Math.max(0, c.g.might(b));
      // o dano é causado pelas unidades, não pelo spell (417.6.b.3)
      c.g.dealDamage(b, ma, a, { byUnit: true });
      c.g.dealDamage(a, mb, b, { byUnit: true });
    },
  },
});
