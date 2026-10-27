import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-141 Renekton, Butcher of the Sands
// "Spend this Energy only to play units or activated abilities of units": parte restrita do pool (adds.only).
registerCard({
  code: 'VEN-141',
  activated: [
    {
      label: '[Rune][Rune], exaurir: adicionar 2 de energia (só unidades)',
      timing: 'reaction',
      exhaustSelf: true,
      isAdd: true,
      cost: E(0, 'any', 'any'),
      adds: { energy: 2, only: ['unit', 'unitAbility'] },
      resolve: function* () {},
    },
  ],
});
