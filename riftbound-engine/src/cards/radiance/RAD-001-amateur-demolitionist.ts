import { registerCard } from '../../engine/script';
import { playBomb } from '../helpers';

// Quando você me joga, jogue uma ficha Bomb num campo de batalha.
registerCard({
  code: 'RAD-001',
  onPlay: [{ label: 'Jogar uma ficha Bomb', resolve: function* (c) { yield* playBomb(c); } }],
});
