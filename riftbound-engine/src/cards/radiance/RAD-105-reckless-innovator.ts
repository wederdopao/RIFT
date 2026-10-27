import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-105',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'exhaust',
      label: 'Escolha: Gold exaurida ou pagar [Chaos] para comprar 1',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const canDraw = g.canPay(c.p, E(0, 'Chaos'));
        const opts = [{ id: 'gold', label: 'Jogar uma ficha Gold exaurida' }, ...(canDraw ? [{ id: 'draw', label: 'Pagar [Chaos] para comprar 1' }] : [])];
        const [m] = opts.length > 1 ? yield* g.ask(c.p, 'choose', 'Reckless Innovator: escolha um', opts) : ['gold'];
        if (m === 'draw') {
          yield* g.payG(c.p, E(0, 'Chaos'));
          yield* g.draw(c.p, 1);
        } else g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
