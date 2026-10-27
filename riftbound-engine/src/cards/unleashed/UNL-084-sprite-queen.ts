import { registerCard } from '../../engine/script';
import type { AbilityDef } from '../../engine/script';

// Quando você me joga ou no início da sua Beginning Phase, jogue uma ficha Sprite de 3 de Might, pronta, com
// [Temporary], na sua base. O gatilho do início da fase vai para a pilha junto com os Temporary (o jogador escolhe a
// ordem, 383.3.d) e resolve antes de pontuar.
const SPRITE: AbilityDef = {
  label: 'Jogar um Sprite pronto na sua base',
  resolve: function* (c) {
    yield* c.g.playTokenG('TOK-SPRITE', c.p, { t: 'base', p: c.p }, true);
  },
};
registerCard({
  code: 'UNL-084',
  onPlay: [SPRITE],
  triggers: [{ ...SPRITE, on: 'beginStart', cond: (c, ev) => ev.player === c.p }],
});
