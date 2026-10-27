import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-145 Nasus, Curator of the Sands
registerCard({
  code: 'VEN-145',
  triggers: [
    {
      // "When you play a unit, gear or activated ability with Energy cost [7] or more": cartas pelo custo impresso; habilidades
      // ativadas (inclusive [Empower]) pelo custo de energia do texto delas (evento 'activate', ev.energy)
      on: ['cardPlayed', 'activate'],
      label: 'Exaurir para preparar até 2 runas',
      optional: 'exaurir Nasus para preparar até 2 runas?',
      cond: (c, ev) =>
        ev.player === c.p &&
        !c.self.exhausted &&
        !!ev.obj &&
        (ev.type === 'activate' ? (ev.energy ?? 0) >= 7 : (c.g.isUnit(ev.obj) || c.g.isGear(ev.obj)) && c.g.data(ev.obj).energy >= 7),
      extraCost: exhaustMe,
      resolve: function* (c) {
        const rs = c.g.runesOf(c.p).filter((r) => r.exhausted);
        if (!rs.length) return;
        const picks = yield* c.g.chooseObj(c.p, 'Nasus: preparar quais runas? (até 2)', rs, 0, 2);
        for (const r of picks) c.g.ready(r, c.p);
      },
    },
  ],
});
