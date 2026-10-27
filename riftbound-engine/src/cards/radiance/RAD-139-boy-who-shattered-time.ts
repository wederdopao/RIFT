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
        // "...and give it 'Kill me at end of turn.'": a unidade que consumir o desconto (inclusive ficha de unidade, que
        // também é jogada, 185.2.a; ev.nextFx) ganha a habilidade na hora em que é jogada, sem item na pilha.
        g.addDelayed({
          controller: c.p,
          sourceId: c.self.id,
          on: 'play',
          once: true,
          untilTurn: g.turn,
          cond: (cc, ev) => {
            if (!(ev.nextFx || []).includes(effId) || !ev.obj) return false;
            const uid = ev.obj.id as string;
            const ver = ev.obj.zoneVersion as number;
            cc.g.addDelayed({
              controller: ev.obj.controller,
              sourceId: uid,
              on: 'turnEnd',
              once: true,
              untilTurn: cc.g.turn,
              ability: {
                label: 'Kill me at end of turn (Boy Who Shattered Time)',
                resolve: function* (c3) {
                  const x = c3.g.objs[uid];
                  if (x && x.zone === 'board' && x.zoneVersion === ver) yield* c3.g.killG(x);
                },
              },
            });
            return false;
          },
          ability: { label: 'Boy Who Shattered Time', resolve: function* () {} },
        });
      },
    },
  ],
});
