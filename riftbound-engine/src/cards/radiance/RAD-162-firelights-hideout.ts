import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-162 Firelights' Hideout
registerCard({
  code: 'RAD-162',
  auras: [
    {
      playKeywords: (g, _src, card, p) =>
        g.isUnit(card) && g.effects.some((e) => e.flag === 'accelNext' && e.player === p) ? { accelerate: true } : undefined,
    },
  ],
  triggers: [
    {
      on: 'conquer',
      label: 'A próxima unidade que você jogar tem Accelerate neste turno',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const eff = g.addEffect({ player: c.p, flag: 'accelNext', until: 'turn' });
        g.addDelayed({
          controller: c.p,
          sourceId: c.self.id,
          on: 'play',
          once: true,
          untilTurn: g.turn,
          cond: (cc, ev) => ev.player === cc.p && !!ev.obj && cc.g.isUnit(ev.obj) && !ev.spell && !ev.token,
          ability: {
            label: 'Fim do Accelerate',
            resolve: function* (cc) {
              cc.g.effects = cc.g.effects.filter((e) => e.id !== eff.id);
            },
          },
        });
      },
    },
  ],
});
