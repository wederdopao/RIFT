import { registerCard } from '../../engine/script';
// Campo: você pode esconder uma carta a mais aqui.
registerCard({
  code: 'OGN-278',
  bfSetup: (g, self) => {
    const i = g.bfOf(self);
    if (i >= 0) g.bfs[i].capacity += 1;
  },
  // novo (UNL): substituído por uma ficha (438), o campo deixa de dar o espaço a mais
  bfTeardown: (g, self) => {
    const i = g.bfOf(self);
    if (i >= 0) g.bfs[i].capacity = Math.max(1, g.bfs[i].capacity - 1);
  },
});
