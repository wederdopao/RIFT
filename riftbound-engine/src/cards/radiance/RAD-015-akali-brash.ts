import { registerCard } from '../../engine/script';
import { banishTopPlayable } from './_rad';

// Primeira vez que me movo no turno: [Add] [1][Rune]. Segunda vez: bana o topo do deck e pode jogá-lo.
registerCard({
  code: 'RAD-015',
  triggers: [
    {
      on: 'move',
      label: 'Primeiro movimento: adicionar [1][Rune]',
      immediate: true,
      cond: (c, ev) => ev.unit?.id === c.self.id && c.g.movesThisTurn(c.self) === 1,
      resolve: function* (c) {
        c.g.addResources(c.p, 1, ['any']);
      },
    },
    {
      on: 'move',
      label: 'Segundo movimento: banir o topo do deck (pode jogá-lo)',
      cond: (c, ev) => ev.unit?.id === c.self.id && c.g.movesThisTurn(c.self) === 2,
      resolve: function* (c) {
        banishTopPlayable(c);
      },
    },
  ],
});
