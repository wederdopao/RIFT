import { registerCard } from '../../engine/script';
import { playBomb } from '../helpers';

// Ao jogar, jogue uma ficha Bomb num campo. Habilidades de gear aliado causam 1 de Bonus Damage.
registerCard({
  code: 'RAD-023',
  onPlay: [{ label: 'Jogar uma ficha Bomb', resolve: function* (c) { yield* playBomb(c); } }],
  auras: [
    {
      bonusDamage: (g, src, target, source) => (src.zone === 'board' && source && g.isGear(source) && source.controller === src.controller ? 1 : 0),
    },
  ],
});
