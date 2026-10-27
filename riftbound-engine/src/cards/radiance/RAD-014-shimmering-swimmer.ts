import { registerCard } from '../../engine/script';
import { T } from '../helpers';
import { friendlyPermanents } from './_rad';

// Você pode matar uma unidade ou gear aliado como custo adicional. Se pagou, cause 2 a uma unidade.
registerCard({
  code: 'RAD-014',
  optionalCosts: [
    {
      label: 'Matar uma unidade ou gear seu como custo adicional?',
      flag: 'killed',
      canPay: (g, self, p) => g.board().some((o) => o.controller === p && (g.isUnit(o) || g.isGear(o))),
      pay: function* (c) {
        const list = friendlyPermanents(c);
        if (!list.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Shimmering Swimmer: matar qual unidade ou gear seu?', list);
        yield* c.g.killG(o);
        return true;
      },
    },
  ],
  triggers: [
    {
      on: 'play',
      label: 'Custo pago: 2 de dano a uma unidade',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.killed,
      targets: [T.anyUnit('Shimmering Swimmer: 2 de dano em qual unidade?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 2, c.self);
      },
    },
  ],
});
