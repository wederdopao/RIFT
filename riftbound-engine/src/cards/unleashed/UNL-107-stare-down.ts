import { registerCard } from '../../engine/script';
import type { Obj, P } from '../../engine/types';

// Escolha uma unidade aliada e um campo de batalha. Mova todas as unidades inimigas naquele campo com menos Might que a
// unidade escolhida para a base delas. Ganhe 1 XP.
// - Os dois são alvos (355.10.d: "todas as unidades num campo" escolhe o campo). O Might da unidade é o da resolução
//   (359.3.f.2); se ela ficou inválida, o Might é nulo e o movimento é ignorado (359.3.e.12).
// - "Ganhe 1 XP" não depende dos alvos: acontece mesmo assim (359.3.e.6, 359.3.e.8).
// - As unidades vão juntas (uma ação) para a base de quem as controla.
registerCard({
  code: 'UNL-107',
  spell: {
    label: 'Stare Down',
    targets: [
      { prompt: 'Stare Down: escolha uma unidade sua', filter: (c, o) => o.controller === c.p },
      { prompt: 'Stare Down: escolha um campo de batalha', kind: 'battlefield' },
    ],
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0]?.[0];
      const bf = c.targets[1]?.[0];
      if (u && bf && u.zone === 'board') {
        const i = g.bfOf(bf);
        const m = g.might(u);
        const enemies = g.unitsAtBf(i).filter((x) => x.controller !== c.p && g.might(x) < m);
        const byCtrl = new Map<P, Obj[]>();
        for (const x of enemies) byCtrl.set(x.controller, [...(byCtrl.get(x.controller) || []), x]);
        for (const [p, us] of byCtrl) g.moveUnits(us, { t: 'base', p }, c.p);
      }
      g.gainXp(c.p, 1, c.self);
    },
  },
});
