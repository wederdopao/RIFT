import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';

const hasFacedown = (g: Engine, p: P) => g.bfs.some((b) => b.facedown.some((id) => g.objs[id].controller === p));

// No início da sua Beginning Phase, se você controla uma carta virada para baixo num campo, compre 1.
// O "se" logo depois da condição faz parte da condição do gatilho: é checado só ao disparar, não na resolução
// (regra 383.2.a.1, exemplo de Sona, Harmonious).
registerCard({
  code: 'OGN-101',
  triggers: [
    {
      on: 'beginStart',
      label: 'Comprar 1 (carta escondida num campo)',
      cond: (c, ev) => ev.player === c.p && hasFacedown(c.g, c.p),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
