import { registerCard } from '../../engine/script';
import { E, bfIdx } from '../helpers';
// Campo (com errata): quando você conquista aqui, você pode pagar [1] e devolver uma unidade que você controla aqui à
// mão do dono para jogar uma ficha de unidade Sand Soldier de 2 de Might aqui.
// "Pagar [1] e devolver uma unidade" é o custo do gatilho ("[fazer X] para [fazer Y]", regra 355.10.c.1): pago ao pô-lo
// na pilha (383.3.b), sem alvo; a unidade é escolhida nesse momento entre as suas que estão aqui.
registerCard({
  code: 'SFD-207',
  triggers: [
    {
      on: 'conquer',
      label: 'Jogar um Sand Soldier aqui',
      optional: 'Pagar [1] e devolver uma unidade sua daqui à mão do dono para jogar um Sand Soldier aqui?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p && c.g.unitsAtBf(bfIdx(c), c.p).length > 0,
      cost: E(1),
      extraCost: function* (c) {
        const g = c.g;
        const mine = g.unitsAtBf(bfIdx(c), c.p);
        if (!mine.length) return false;
        const [u] = yield* g.chooseObj(c.p, "Emperor's Dais: devolver qual unidade sua daqui à mão do dono?", mine);
        if (!u) return false;
        g.returnToHand(u);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-SAND', c.p, { t: 'bf', i: bfIdx(c) });
      },
    },
  ],
});
