import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-141 Hexplosives Expert
import { playBomb } from '../helpers';
registerCard({
  code: 'RAD-141',
  activated: [
    {
      label: '[1][Rune], exaurir: jogar uma ficha Bomb num campo',
      exhaustSelf: true,
      cost: E(1, 'any'),
      resolve: function* (c) {
        yield* playBomb(c);
      },
    },
  ],
});
