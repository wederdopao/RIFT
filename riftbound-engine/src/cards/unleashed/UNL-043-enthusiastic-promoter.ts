import { registerCard } from '../../engine/script';

// [Backline]. Quando eu seguro (hold), dê [Buff] a todas as unidades aqui (+1 se ainda não tiver buff).
// "Todas as unidades aqui": todas no meu local na resolução (359.3.f.2), sem escolha (355.10.d). Se saí do tabuleiro,
// "aqui" é nulo e nada acontece (359.3.e.12).
registerCard({
  code: 'UNL-043',
  keywords: { backline: true },
  triggers: [
    {
      on: 'hold',
      label: 'Buff em todas as unidades aqui',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board' || !c.self.loc) return;
        for (const u of g.unitsAt(c.self.loc)) g.buff(u, c.p);
      },
    },
  ],
});
