import { registerCard } from '../../engine/script';

// Action. Ao jogar, você pode gastar um Buff como custo adicional; se fizer, ignore o custo deste spell. Prepare uma unidade.
registerCard({
  code: 'OGN-146',
  keywords: { action: true },
  optionalCosts: [
    {
      label: 'Gastar um Buff de uma unidade sua para jogar sem pagar o custo?',
      flag: 'spentBuff',
      energyMod: -99, // ignora o custo (Wallop não tem power)
      canPay: (g, self, p) => g.units().some((u) => u.controller === p && u.buffs > 0),
      pay: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p && u.buffs > 0);
        if (!us.length) return false;
        const [u] = yield* c.g.chooseObj(c.p, 'Wallop: gastar o Buff de qual unidade?', us);
        return c.g.spendBuff(u);
      },
    },
  ],
  spell: {
    label: 'Wallop',
    targets: [{ prompt: 'Wallop: preparar qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) {
        c.g.ready(u, c.p);
        c.g.say(`${c.g.name(u)} fica pronta.`);
      }
    },
  },
});
