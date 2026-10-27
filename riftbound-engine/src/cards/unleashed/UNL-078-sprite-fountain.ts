import { registerCard } from '../../engine/script';
import type { AbilityDef } from '../../engine/script';

// Gear. [Temporary]. Quando você joga isto, jogue uma ficha Sprite de 3 de Might, pronta, com [Temporary], na sua base.
// [Deathknell] Repita o efeito de jogada deste gear (quando isto morre — inclusive pelo próprio Temporary).
const SPRITE: AbilityDef = {
  label: 'Jogar um Sprite pronto na sua base',
  resolve: function* (c) {
    yield* c.g.playTokenG('TOK-SPRITE', c.p, { t: 'base', p: c.p }, true);
  },
};
registerCard({
  code: 'UNL-078',
  keywords: { temporary: true },
  onPlay: [SPRITE],
  triggers: [
    {
      ...SPRITE,
      on: 'die',
      zone: 'self',
      label: 'Deathknell: jogar um Sprite pronto na sua base',
      cond: (c, ev) => ev.obj?.id === c.self.id,
    },
  ],
});
