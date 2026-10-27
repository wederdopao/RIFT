import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Quando você me joga, escolha uma unidade inimiga num campo. Nós causamos uma à outra dano igual aos nossos Mights.
// Os Mights são lidos na resolução (regra 359.3.f.2). Se a Snapvine saiu do tabuleiro antes, o Might dela é "nulo" e ela
// não pode receber dano: a instrução é ignorada (regra 359.3.e.12) — não se usa a última informação conhecida.
// O dano é causado pelas unidades (417.6.b.3): Unyielding Spirit não o previne (FAQ riftjudge #8166).
registerCard({
  code: 'OGN-149',
  onPlay: [
    {
      label: 'Trocar dano com uma unidade inimiga num campo',
      targets: [
        { prompt: 'Carnivorous Snapvine: qual unidade inimiga num campo?', filter: (c, o) => o.controller !== c.p && atBf(c, o) },
      ],
      resolve: function* (c) {
        const g = c.g;
        const e = c.targets[0][0];
        if (!e || c.self.zone !== 'board') return;
        const ms = Math.max(0, g.might(c.self));
        const me = Math.max(0, g.might(e));
        // o dano é causado pelas unidades (417.6.b.3)
        g.dealDamage(e, ms, c.self, true);
        g.dealDamage(c.self, me, e, true);
      },
    },
  ],
});
