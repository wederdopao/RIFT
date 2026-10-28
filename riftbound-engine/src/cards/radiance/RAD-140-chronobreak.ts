import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-140 Chronobreak
import { NO_COST } from '../../engine/types';
import type { Loc, P } from '../../engine/types';
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
      const back: { id: string; ver: number; loc: Loc; owner: P }[] = [];
      for (const u of picks) {
        const loc = g.locOf(u) as Loc;
        g.banishObj(u);
        if (!u.token && u.zone === 'banish') back.push({ id: u.id, ver: u.zoneVersion, loc, owner: u.owner }); // ficha: deixou de existir
      }
      // "(You choose the order.)": quem joga Chronobreak escolhe a ordem; "its owner plays that unit back to the same
      // location or to their base": o dono escolhe entre o mesmo local e a base dele (356.1.b.1: custo base [0]).
      while (back.length) {
        let k = 0;
        if (back.length > 1) {
          const [o] = yield* g.chooseObj(c.p, 'Chronobreak: qual unidade volta agora?', back.map((b) => g.objs[b.id]));
          k = Math.max(0, back.findIndex((b) => b.id === o?.id));
        }
        const [b] = back.splice(k, 1);
        const o = g.objs[b.id];
        if (o.zone !== 'banish' || o.zoneVersion !== b.ver) continue;
        const home: Loc = { t: 'base', p: b.owner };
        let to: Loc = home;
        if (b.loc.t === 'bf' && g.playLocOk(b.owner, o, b.loc)) {
          const [w] = yield* g.ask(b.owner, 'choose', `Chronobreak: jogar ${g.name(o)} de volta onde?`, [
            { id: 'same', label: g.locName(b.loc), obj: g.bfs[b.loc.i].objId },
            { id: 'base', label: g.locName(home) },
          ]);
          if (w === 'same') to = b.loc;
        }
        yield* g.playFromEffect(b.owner, o, NO_COST, to);
      }
    },
  },
});
