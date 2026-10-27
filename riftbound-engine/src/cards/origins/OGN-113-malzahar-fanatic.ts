import { registerCard } from '../../engine/script';
import { DOMAINS } from '../../engine/types';

// Matar uma unidade ou gear aliado, exaurir: Action – Add [qualquer][qualquer].
// Sem [Reaction], não é ativável no meio de um pagamento (429.3), mas o pagamento automático pode usá-la quando o
// jogador poderia ativá-la logo antes (estado aberto no seu turno ou com o Focus): ele confirma e escolhe o que matar.
registerCard({
  code: 'OGN-113',
  activated: [
    {
      label: 'Matar unidade/gear aliado, exaurir: adicionar 2 power',
      exhaustSelf: true,
      isAdd: true,
      timing: 'action',
      canPayExtra: (c) => c.g.board().some((o) => o.controller === c.p && (c.g.isUnit(o) || c.g.isGear(o))),
      extraCost: function* (c) {
        const g = c.g;
        const opts = g.board().filter((o) => o.controller === c.p && (g.isUnit(o) || g.isGear(o)));
        if (!opts.length) return false;
        const [o] = yield* g.chooseObj(c.p, 'Malzahar: matar qual unidade ou gear seu?', opts);
        if (!o) return false;
        yield* g.killG(o, 'é sacrificada');
        return true;
      },
      adds: { power: [[...DOMAINS], [...DOMAINS]] }, // o motor põe no pool
      resolve: function* () {},
    },
  ],
});
