import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-140 Chronobreak
import { NO_COST } from '../../engine/types';
import type { Loc } from '../../engine/types';
registerCard({
  code: 'RAD-140',
  mandatoryCost: {
    label: 'pagar qualquer quantidade de Power',
    canPay: () => true,
    pay: function* (c) {
      const g = c.g;
      const n = g.units().filter((u) => u.controller === c.p).length;
      const price = (k: number) => E(0, ...Array.from({ length: k }, () => 'any' as const));
      const opts: number[] = [];
      for (let k = 0; k <= n; k++) if (g.canPay(c.p, g.addCost(g.printedCost(c.self), price(k)), true)) opts.push(k);
      if (!opts.length) opts.push(0);
      const [id] = yield* g.ask(c.p, 'choose', 'Chronobreak: quanto Power pagar?', opts.map((k) => ({ id: String(k), label: String(k) })));
      const k = Number(id);
      if (k > 0) yield* g.payG(c.p, price(k), true);
      c.data.x = k;
      return true;
    },
  },
  spell: {
    label: 'Chronobreak',
    resolve: function* (c) {
      const g = c.g;
      const x = Number(c.data.x || 0);
      const mine = g.units().filter((u) => u.controller === c.p);
      if (!x || !mine.length) return;
      const picks = yield* g.chooseObj(c.p, `Chronobreak: banir ${Math.min(x, mine.length)} unidade(s) sua(s)`, mine, Math.min(x, mine.length), Math.min(x, mine.length));
      const back: { o: typeof picks[0]; loc: Loc }[] = [];
      for (const u of picks) {
        const loc = g.locOf(u) as Loc;
        back.push({ o: u, loc });
        g.banishObj(u);
      }
      for (const { o, loc } of back) {
        if (o.token || o.zone !== 'banish') continue;
        yield* g.playFromEffect(o.owner, o, NO_COST, loc.t === 'bf' ? loc : { t: 'base', p: o.owner }, { allFree: true });
      }
    },
  },
});
