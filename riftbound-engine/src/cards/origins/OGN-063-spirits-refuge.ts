import { registerCard } from '../../engine/script';

// Gear. Quando você joga isto, dê um Buff a uma unidade aliada.
// Unidades aliadas com Buff têm Deflect, se ainda não tinham.
// Com duas cópias, a segunda vê que a unidade já tem Deflect e não concede outro: o total é Deflect 1.
let busy = false; // evita recursão ao checar "se ainda não tinham"
registerCard({
  code: 'OGN-063',
  onPlay: [
    {
      label: 'Buff numa unidade aliada',
      targets: [{ prompt: "Spirit's Refuge: Buff em qual unidade sua?", filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
  auras: [
    {
      keywords: (g, src, t) => {
        if (busy || src.zone !== 'board' || t.zone !== 'board' || !g.isUnit(t) || t.controller !== src.controller || t.buffs <= 0)
          return undefined;
        // várias cópias não somam: só a primeira concede
        const first = g.board().find((o) => o.code === 'OGN-063' && o.controller === src.controller);
        if (first && first.id !== src.id) return undefined;
        busy = true;
        try {
          if (g.kw(t).deflect) return undefined;
        } finally {
          busy = false;
        }
        return { deflect: 1 };
      },
    },
  ],
});
