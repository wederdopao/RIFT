import { registerCard } from '../../engine/script';
// Action. Prepare uma unidade aliada. Ela causa dano igual ao Might dela a uma unidade inimiga num campo de batalha.
registerCard({
  code: 'OGN-260',
  keywords: { action: true },
  spell: {
    label: 'Last Breath',
    targets: [
      { prompt: 'Last Breath: preparar qual unidade sua?', filter: (c, o) => o.controller === c.p },
      { prompt: 'Last Breath: dano em qual unidade inimiga num campo?', filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const e = c.targets[1]?.[0];
      if (!u || u.zone !== 'board') return;
      g.ready(u);
      // a unidade é a fonte do dano (regra 417.6.b.3): não é dano de spell, sem Bonus Damage
      if (e) g.dealDamage(e, Math.max(0, g.might(u)), u, { byUnit: true });
    },
  },
});
