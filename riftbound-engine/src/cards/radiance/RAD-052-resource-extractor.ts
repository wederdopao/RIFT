import { registerCard } from '../../engine/script';

// Deploy. No fim do seu turno, se você controla este campo, jogue uma ficha Gold exausta.
registerCard({
  code: 'RAD-052',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'turnEnd',
      label: 'Jogar uma ficha Gold exausta',
      cond: (c, ev) => {
        const i = c.g.bfIndex(c.self);
        return ev.player === c.p && i >= 0 && c.g.bfs[i].controller === c.p;
      },
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
