import { registerCard } from '../../engine/script';

// Você pode devolver um gear aliado à mão como custo adicional. Se pagou, me prepare e dê +Might igual ao custo de Energia do gear.
registerCard({
  code: 'RAD-066',
  optionalCosts: [
    {
      label: 'Devolver um gear seu à mão como custo adicional?',
      flag: 'returned',
      canPay: (g, self, p) => g.gearOf(p).length > 0,
      pay: function* (c) {
        const gs = c.g.gearOf(c.p);
        if (!gs.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Spirit of the Forge: devolver qual gear seu à mão?', gs);
        c.data.gearEnergy = c.g.data(o).energy;
        c.g.returnToHand(o);
        return true;
      },
    },
  ],
  triggers: [
    {
      on: 'play',
      label: 'Custo pago: me preparar e +Might',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.returned,
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self, c.p);
        const n = c.ev?.data?.gearEnergy || 0;
        if (n > 0) c.g.giveMight(c.self, n);
      },
    },
  ],
});
