import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-139 Boy Who Shattered Time
registerCard({
  code: 'RAD-139',
  empower: { cost: E(1), exhaustSelf: true },
  activated: [
    {
      label: 'Disempower em mim, exaurir: a próxima unidade custa menos e morre no fim do turno',
      exhaustSelf: true,
      condition: (_g, self) => self.empowered,
      extraCost: disempowerMe,
      resolve: function* (c) {
        const g = c.g;
        // "Reduce the cost of the next unit you play this turn by [2][Rune]": consumido por essa unidade (takeNextPlay)
        const effId = g.addEffect({ player: c.p, nextPlay: 'unit', costMod: -2, powerLess: 1, until: 'turn' }).id;
        g.addDelayed({
          controller: c.p,
          sourceId: c.self.id,
          on: 'play',
          once: true,
          untilTurn: g.turn,
          // a unidade jogada que consumiu o desconto (fichas não consomem; o efeito sai de g.effects antes do 'play')
          cond: (cc, ev) => ev.player === cc.p && !!ev.obj && cc.g.isUnit(ev.obj) && !ev.spell && !ev.token && !cc.g.effects.some((e) => e.id === effId),
          ability: {
            label: 'Matar a unidade no fim do turno',
            resolve: function* (cc) {
              const u = cc.ev?.obj;
              if (!u) return;
              const uid = u.id;
              const ver = u.zoneVersion;
              cc.g.addDelayed({
                controller: cc.p,
                sourceId: uid,
                on: 'turnEnd',
                once: true,
                untilTurn: cc.g.turn,
                ability: {
                  label: 'Matar a unidade (fim do turno)',
                  resolve: function* (c3) {
                    const x = c3.g.objs[uid];
                    if (x && x.zone === 'board' && x.zoneVersion === ver) yield* c3.g.killG(x);
                  },
                },
              });
            },
          },
        });
      },
    },
  ],
});
