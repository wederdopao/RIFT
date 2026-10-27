import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Escolha um oponente. Ele revela a mão. Escolha uma carta que não seja unidade e recicle-a.
registerCard({
  code: 'OGN-156',
  spell: {
    label: 'Sabotage',
    resolve: function* (c) {
      const g = c.g;
      const op = (1 - c.p) as P;
      const hand = g.pl[op].hand.map((id) => g.objs[id]);
      g.say(`${g.pname(op)} revela a mão: ${hand.length ? hand.map((o) => g.name(o)).join(', ') : '(vazia)'}.`, op);
      const cands = hand.filter((o) => !g.isUnit(o));
      if (!cands.length) {
        g.say('Sabotage: nenhuma carta que não seja unidade.');
        return;
      }
      const [o] = yield* g.chooseObj(c.p, 'Sabotage: reciclar qual carta (não unidade) da mão do oponente?', cands);
      g.recycleCard(o);
      g.say(`${g.name(o)} é reciclada (vai para o fundo do deck de ${g.pname(op)}).`);
    },
  },
});
