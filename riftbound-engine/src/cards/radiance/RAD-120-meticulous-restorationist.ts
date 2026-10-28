import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-120',
  triggers: [
    {
      on: 'cardPlayed',
      zone: 'trash',
      label: 'Jogar do descarte por [Order]',
      // "you may" no início do efeito: decidido ao finalizar o gatilho (383.3.a); [Order] é o custo da jogada, pago na resolução
      optional: 'Jogar Meticulous Restorationist do descarte por [Order]?',
      cond: (c, ev) => ev.player === c.p && ev.obj?.id !== c.self.id && !!ev.obj && c.g.data(ev.obj).energy >= 7,
      possible: (c) => c.self.zone === 'trash',
      resolve: function* (c) {
        if (c.self.zone !== 'trash') return;
        yield* c.g.playFromEffect(c.p, c.self, E(0, 'Order'));
      },
    },
  ],
});
