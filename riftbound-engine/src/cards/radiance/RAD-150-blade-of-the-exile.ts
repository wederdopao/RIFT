import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

// [Equip] — [Rune] ou exaurir uma unidade aliada. Texto de efeito: [Ganking]. Might Bonus +3 (somado pelo motor).
const RUNE = E(0, 'any');
const readyFriends = (g: any, p: any): Obj[] => g.units().filter((u: Obj) => u.controller === p && !u.exhausted);
registerCard({
  code: 'RAD-150',
  equipCost: NO_COST,
  equipExtra: {
    label: '[Rune] ou exaurir uma unidade aliada',
    canPay: (g, _gear, p) => g.canPay(p, RUNE) || readyFriends(g, p).length > 0,
    pay: function* (c) {
      const g = c.g;
      const units = readyFriends(g, c.p);
      const canRune = g.canPay(c.p, RUNE);
      let useRune = canRune;
      if (canRune && units.length) {
        const [id] = yield* g.ask(c.p, 'choose', 'Blade of the Exile: como pagar o Equip?', [
          { id: 'r', label: 'Pagar [Rune]' },
          { id: 'u', label: 'Exaurir uma unidade aliada' },
        ]);
        useRune = id === 'r';
      }
      if (useRune) {
        yield* g.payG(c.p, RUNE);
        return true;
      }
      if (!units.length) return false;
      const [u] = yield* g.chooseObj(c.p, 'Blade of the Exile: exaurir qual unidade aliada?', units);
      if (!u) return false;
      g.markExhausted(u);
      return true;
    },
  },
  equipped: { keywords: { ganking: true } },
});
