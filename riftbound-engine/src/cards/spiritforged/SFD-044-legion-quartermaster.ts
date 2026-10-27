import { registerCard } from '../../engine/script';

// Como custo adicional para me jogar, devolva um gear aliado para a mão do dono (custo: não é alvo, regra 355.10.c).
registerCard({
  code: 'SFD-044',
  mandatoryCost: {
    label: 'Legion Quartermaster: é preciso devolver um gear seu para a mão para jogá-lo.',
    canPay: (g, self, p) => g.gearOf(p).length > 0,
    pay: function* (c) {
      const gs = c.g.gearOf(c.p);
      if (!gs.length) return false;
      const [o] = yield* c.g.chooseObj(c.p, 'Legion Quartermaster: devolver qual gear seu para a mão (custo adicional)?', gs);
      c.g.returnToHand(o);
      return true;
    },
  },
});
