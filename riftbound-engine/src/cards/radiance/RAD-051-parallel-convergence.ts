import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Como custo adicional, devolva uma unidade aliada à mão. Cause 5 a uma unidade num campo.
// O alvo é escolhido antes do custo: a unidade devolvida tem de ser outra que não o alvo (senão o spell perderia o alvo),
// então só se pode escolher como alvo uma unidade quando há outra unidade aliada para devolver.
registerCard({
  code: 'RAD-051',
  mandatoryCost: {
    label: 'Parallel Convergence: é preciso devolver uma unidade sua à mão para jogá-lo.',
    canPay: (g, self, p) => g.units().some((u) => u.controller === p),
    pay: function* (c) {
      const tgt = c.targets[0]?.[0];
      const us = c.g.units().filter((u) => u.controller === c.p && u.id !== tgt?.id);
      if (!us.length) return false;
      const [u] = yield* c.g.chooseObj(c.p, 'Parallel Convergence: devolver qual unidade sua à mão?', us);
      c.g.returnToHand(u);
      return true;
    },
  },
  spell: {
    label: 'Parallel Convergence',
    targets: [
      {
        ...T.unitAtBf('Parallel Convergence: 5 de dano em qual unidade num campo?'),
        // na resolução a unidade já foi devolvida: só confere o local (o custo já foi pago)
        filter: (c, o) => c.g.bfIndex(o) >= 0 && (!!c.item || c.g.units().some((u) => u.controller === c.p && u.id !== o.id)),
      },
    ],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 5, c.self);
    },
  },
});
