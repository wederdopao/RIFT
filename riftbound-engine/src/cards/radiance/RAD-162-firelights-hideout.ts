import { registerCard } from '../../engine/script';
// RAD-162 Firelights' Hideout — "When you conquer here, the next unit you play this turn has [Accelerate]."
// Efeito "a próxima unidade" (nextPlay 'unit', como Sun Disc e Last Caress): vale para a próxima unidade jogada, ficha de
// unidade inclusive (uma ficha de unidade é unidade e é jogada: 185.2.a, 185.2.d, 350.2), e é consumido ao jogá-la,
// pague ela o Accelerate ou não. O Accelerate é dado enquanto ela é jogada (Aura.playKeywords).
registerCard({
  code: 'RAD-162',
  auras: [
    {
      playKeywords: (g, _src, card, p) =>
        g.isUnit(card) && g.effects.some((e) => e.flag === 'accelNext' && g.nextPlayMatches(e, card, p)) ? { accelerate: true } : undefined,
    },
  ],
  triggers: [
    {
      on: 'conquer',
      label: 'A próxima unidade que você jogar neste turno tem Accelerate',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p,
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, nextPlay: 'unit', flag: 'accelNext', until: 'turn' });
      },
    },
  ],
});
