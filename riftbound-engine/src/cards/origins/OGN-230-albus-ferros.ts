import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Quando você me joga, gaste quantos Buffs quiser. Para cada Buff gasto, canalize 1 runa exaurida.
// Só se gastam buffs de unidades que você controla (regra 745.2). A escolha é feita na resolução (355.17).
// Uma unidade que pode ter vários buffs (Lee Sin, Ascetic) aparece uma vez por buff.
registerCard({
  code: 'OGN-230',
  onPlay: [
    {
      label: 'Gastar Buffs para canalizar runas exauridas',
      resolve: function* (c) {
        const g = c.g;
        const us = g.units().filter((u) => u.controller === c.p && u.buffs > 0);
        if (!us.length) return;
        const opts = us.flatMap((u) =>
          Array.from({ length: u.buffs }, (_, k) => ({ id: `${u.id}#${k}`, label: `${g.describe(u)}${u.buffs > 1 ? ` — buff ${k + 1}` : ''}`, obj: u.id })),
        );
        const ids = yield* g.ask(c.p, 'choose', 'Albus Ferros: gastar quais Buffs? (1 runa exaurida por Buff)', opts, 0, opts.length);
        let n = 0;
        for (const id of ids) {
          const u: Obj = g.objs[id.split('#')[0]];
          if (g.spendBuff(u)) n++;
        }
        if (n) g.channel(c.p, n, true);
      },
    },
  ],
});
