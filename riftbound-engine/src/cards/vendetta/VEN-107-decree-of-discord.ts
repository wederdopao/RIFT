import { registerCard } from '../../engine/script';
import { hasDomain } from './_bh';
import type { Obj } from '../../engine/types';
import type { Ctx, TargetSpec } from '../../engine/script';

// Devolva qualquer número de unidades Order inimigas com Might total 5 ou menos às mãos dos donos.
// Os alvos são escolhidos ao jogar, um de cada vez, sem passar de 5 de Might no total (nenhuma para parar).
registerCard({
  code: 'VEN-107',
  spell: {
    label: 'Decree of Discord',
    targets: (c) => {
      const g = c.g;
      const basic = (cc: Ctx, o: Obj) => o.controller !== cc.p && hasDomain(cc.g, o, 'Order');
      const n = g.units().filter((u) => basic(c, u) && g.might(u) <= 5).length;
      const specs: TargetSpec[] = [];
      for (let i = 0; i < n; i++)
        specs.push({
          prompt: i === 0 ? 'Decree of Discord: devolver qual unidade Order inimiga? (Might total até 5)' : 'Decree of Discord: devolver outra? (nenhuma para parar)',
          min: 0,
          max: 1,
          filter: (cc, o) => {
            if (!basic(cc, o)) return false;
            if (cc.item) return true; // na resolução só confere que ainda é uma Order inimiga
            const prev = cc.targets.flat();
            if (i > 0 && !(cc.targets[i - 1] || []).length) return false; // já parou
            if (prev.some((x) => x.id === o.id)) return false;
            return prev.reduce((sum, x) => sum + cc.g.might(x), 0) + cc.g.might(o) <= 5;
          },
        });
      return specs;
    },
    resolve: function* (c) {
      for (const u of c.targets.flat()) if (u.zone === 'board') c.g.returnToHand(u);
    },
  },
});
