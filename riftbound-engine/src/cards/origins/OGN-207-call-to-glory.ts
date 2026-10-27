import { registerCard } from '../../engine/script';

// Reaction. Ao jogar, você pode gastar um Buff como custo adicional; se fizer, ignore o custo desta carta.
// Dê +3 de Might a uma unidade neste turno.
registerCard({
  code: 'OGN-207',
  keywords: { reaction: true },
  optionalCosts: [
    {
      label: 'Gastar um Buff para jogar sem pagar o custo?',
      flag: 'spentBuff',
      energyMod: -3,
      canPay: (g, self, p) => g.units().some((u) => u.controller === p && u.buffs > 0),
      pay: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p && u.buffs > 0);
        if (!us.length) return false;
        const [u] = yield* c.g.chooseObj(c.p, 'Call to Glory: gastar o Buff de qual unidade?', us);
        return c.g.spendBuff(u);
      },
    },
  ],
  spell: {
    label: 'Call to Glory',
    targets: [{ prompt: 'Call to Glory: +3 em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, 3);
    },
  },
});
