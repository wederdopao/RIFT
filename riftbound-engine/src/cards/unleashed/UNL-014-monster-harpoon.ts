import { registerCard } from '../../engine/script';

// Monster Harpoon. Action. Cause 2 de dano a uma unidade num campo de batalha. Se você controla uma carta virada para
// baixo (escondida, em qualquer campo), cause 4 a ela em vez disso. Conferido na resolução.
registerCard({
  code: 'UNL-014',
  keywords: { action: true },
  spell: {
    label: 'Monster Harpoon',
    targets: [{ prompt: 'Monster Harpoon: dano em qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const facedown = g.bfs.some((b) => b.facedown.some((id) => g.objs[id].controller === c.p));
      g.dealDamage(u, facedown ? 4 : 2, c.self);
    },
  },
});
