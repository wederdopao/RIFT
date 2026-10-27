import { registerCard } from '../../engine/script';
import { bfIdx, youHere } from '../helpers';
// Campo: no início da sua Beginning Phase, você pode matar uma unidade que você controla aqui para comprar 1 (antes de
// pontuar).
// - "Você" = quem controla o campo (190.6.d); sem controlador, nada. "Matar ... para" é custo dentro da instrução
//   (355.10.c.1): sem alvo, a unidade é escolhida e morta ao pôr o gatilho na pilha; "você pode" decide se ele vai.
// - Dispara junto com o Temporary e outros gatilhos do início da fase: o jogador escolhe a ordem (383.3.d).
registerCard({
  code: 'UNL-209',
  triggers: [
    {
      on: 'beginStart',
      label: 'Matar uma unidade sua aqui para comprar 1',
      optional: 'matar uma unidade que você controla neste campo para comprar 1?',
      cond: (c, ev) => youHere(c, ev.player) && ev.player === c.p && c.g.unitsAtBf(bfIdx(c), c.p).length > 0,
      extraCost: function* (c) {
        const g = c.g;
        const mine = g.unitsAtBf(bfIdx(c), c.p);
        if (!mine.length) return false;
        const [u] = yield* g.chooseObj(c.p, 'Dusk Rose Lab: matar qual unidade sua aqui?', mine);
        if (!u) return false;
        yield* g.killG(u);
        return true; // custo pago mesmo se a morte for substituída (203.2)
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
