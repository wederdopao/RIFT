import { registerCard } from '../../engine/script';

// Accelerate, Assault. Ao me jogar, você pode gastar quantos Buffs quiser como custo adicional:
// meu custo cai [Body] para cada Buff gasto.
registerCard({
  code: 'OGN-150',
  keywords: { accelerate: true, assault: 1 },
  optionalCosts: [
    {
      label: 'Gastar Buffs para reduzir o custo em 1 Body por Buff?',
      flag: 'spentBuffs',
      canPay: (g, self, p) => g.units().some((u) => u.controller === p && u.buffs > 0),
      maxPowerCut: (g, self, p) => g.units().filter((u) => u.controller === p && u.buffs > 0).length,
      pay: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p && u.buffs > 0);
        if (!us.length) return false;
        // "qualquer número de buffs": cada um tira 1 Body (2 do custo + 1 do Accelerate); o custo não fica negativo (356.6)
        const chosen = yield* c.g.chooseObj(c.p, 'Kraken Hunter: gastar o Buff de quais unidades? (cada um tira 1 Body do custo)', us, 1, us.length);
        let n = 0;
        for (const u of chosen) if (c.g.spendBuff(u)) n++;
        c.data.krakenBuffs = n;
        return n > 0;
      },
      powerCut: (c) => c.data.krakenBuffs || 0,
    },
  ],
});
