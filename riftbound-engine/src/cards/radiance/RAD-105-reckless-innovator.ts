import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { chooseMode } from './_rad';

// Accelerate. "When I become exhausted, choose one — Play a Gold gear token exhausted. / Pay [Chaos] to draw 1."
// O modo é escolhido ao pôr o gatilho na pilha (355.3, 402.2); o [Chaos] do segundo modo é custo dentro da instrução,
// pago na resolução, e quem não pagar não compra (204.3.b, 444.2.b). Entrar exaurida não é "ficar exaurida"
// (RiftJudge #12948, #12983).
registerCard({
  code: 'RAD-105',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'exhaust',
      label: 'Escolha: Gold exaurida ou pagar [Chaos] para comprar 1',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      prepare: function* (c) {
        const m = yield* chooseMode(c, 'Reckless Innovator: escolha um', [
          { id: 'gold', label: 'Jogar uma ficha Gold exaurida' },
          { id: 'draw', label: 'Pagar [Chaos] para comprar 1' },
        ]);
        if (!m) return false;
        c.data.mode = m;
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        if (c.data.mode === 'draw') {
          const cost = E(0, 'Chaos');
          if (g.canPay(c.p, cost) && (yield* g.yesNo(c.p, 'Reckless Innovator: pagar [Chaos] para comprar 1?'))) {
            yield* g.payG(c.p, cost);
            yield* g.draw(c.p, 1);
          }
        } else g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
