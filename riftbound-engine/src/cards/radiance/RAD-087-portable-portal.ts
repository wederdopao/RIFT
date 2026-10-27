import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-087',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'play',
      label: 'Pagar [Body] para preparar uma unidade aqui',
      optional: 'Pagar [Body] para preparar uma unidade aqui?',
      cost: E(0, 'Body'),
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [{ prompt: 'Portable Portal: preparar qual unidade aqui?', filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self) }],
      resolve: function* (c) { const u = c.targets[0][0]; if (u) c.g.ready(u, c.p); },
    },
  ],
  auras: [
    {
      keywords: (g, src, t) => (g.isUnit(t) && t.controller === src.controller && g.bfIndex(src) >= 0 && g.bfIndex(t) === g.bfIndex(src) ? { ganking: true } : undefined),
    },
  ],
});
