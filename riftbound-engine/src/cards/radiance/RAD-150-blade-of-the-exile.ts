import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import { E } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';

// RAD-150 Blade of the Exile — "[Equip] — [Rune] or exhaust a friendly unit." Texto de efeito: [Ganking]. Might Bonus +3
// (somado pelo motor). O jogador escolhe qual das duas alternativas paga. Pelo Weaponmaster ([A] a menos, 821.1.c) a
// alternativa [Rune] perde o único pip e sai de graça; exaurir uma unidade não é power e continua inteiro (RiftJudge
// #10704, Blade of the Ruined King).
const RUNE = E(0, 'any');
const readyFriends = (g: Engine, p: P): Obj[] => g.units().filter((u: Obj) => u.controller === p && !u.exhausted);
registerCard({
  code: 'RAD-150',
  equipCost: NO_COST,
  equipExtra: {
    label: '[Rune] ou exaurir uma unidade aliada',
    canPay: (g, _gear, p, wm) => !!wm || g.canPay(p, RUNE) || readyFriends(g, p).length > 0,
    pay: function* (c) {
      const g = c.g;
      const wm = !!c.data.weaponmaster; // a alternativa [Rune] fica sem custo
      const units = readyFriends(g, c.p);
      const canRune = wm || g.canPay(c.p, RUNE);
      let useRune = canRune;
      if (canRune && units.length) {
        const [id] = yield* g.ask(c.p, 'choose', 'Blade of the Exile: como pagar o Equip?', [
          { id: 'r', label: wm ? 'Pagar [Rune] (sai de graça pelo Weaponmaster)' : 'Pagar [Rune]' },
          { id: 'u', label: 'Exaurir uma unidade aliada' },
        ]);
        useRune = id === 'r';
      }
      if (useRune) {
        if (!wm) yield* g.payG(c.p, RUNE);
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
