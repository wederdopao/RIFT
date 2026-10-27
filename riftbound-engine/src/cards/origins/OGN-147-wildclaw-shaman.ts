import { registerCard } from '../../engine/script';

// Quando você me joga, você pode gastar um Buff para me dar Buff e me preparar.
registerCard({
  code: 'OGN-147',
  onPlay: [
    {
      label: 'Gastar um Buff para receber Buff e ficar pronta',
      optional: 'Gastar um Buff de uma unidade sua para dar Buff e preparar Wildclaw Shaman?',
      extraCost: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p && u.buffs > 0);
        if (!us.length) return false;
        const [u] = yield* c.g.chooseObj(c.p, 'Gastar o Buff de qual unidade?', us);
        return c.g.spendBuff(u);
      },
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.buff(c.self, c.p);
        c.g.ready(c.self, c.p);
      },
    },
  ],
});
