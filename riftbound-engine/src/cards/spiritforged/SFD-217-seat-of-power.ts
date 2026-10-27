import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você conquista aqui, compre 1 para cada outro campo que você (ou aliados) controla. Contado na
// resolução. (1x1: não há aliados.)
registerCard({
  code: 'SFD-217',
  triggers: [
    {
      on: 'conquer',
      label: 'Comprar 1 por outro campo que você controla',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const here = bfIdx(c);
        const n = g.bfs.filter((b, i) => i !== here && b.controller === c.p).length;
        if (n) yield* g.draw(c.p, n);
        else g.say(`${g.pname(c.p)} não controla outros campos.`, c.p);
      },
    },
  ],
});
