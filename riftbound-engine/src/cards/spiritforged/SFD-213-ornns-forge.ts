import { registerCard } from '../../engine/script';
// Campo: enquanto você controla este campo, o primeiro gear aliado que não é ficha jogado em cada turno custa [1] a
// menos. "O primeiro" conta todos os gear (não fichas) que você jogou neste turno, mesmo antes de controlar o campo.
registerCard({
  code: 'SFD-213',
  auras: [
    {
      costMod: (g, src, card, p) => {
        const i = g.bfOf(src);
        if (i < 0 || g.bfs[i].controller !== p || !g.isGear(card) || card.token) return 0;
        const gearBefore = g.pl[p].played.some((id) => id !== card.id && g.objs[id] && g.isGear(g.objs[id]) && !g.objs[id].token);
        return gearBefore ? 0 : -1;
      },
    },
  ],
});
