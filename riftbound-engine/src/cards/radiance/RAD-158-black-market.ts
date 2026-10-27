import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-158 Black Market
// A habilidade é concedida à lenda de cada jogador (uma vez por turno dele), controle ele o campo ou não.
registerCard({
  code: 'RAD-158',
  auras: [
    {
      grantActivated: (g, src, holder) => (g.bfOf(src) >= 0 && g.kind(holder) === 'legend' ? [0] : []),
    },
  ],
  activated: [
    {
      label: '[Rune][Rune]: comprar 1 (uma vez por turno)',
      cost: E(0, 'any', 'any'),
      condition: (g, self) => self.data?.blackMarketTurn !== g.turn,
      resolve: function* (c) {
        c.self.data = { ...(c.self.data || {}), blackMarketTurn: c.g.turn };
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
