import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';

// Square Up. [Repeat] — Descartar 1. Dê [Assault 4] a uma unidade neste turno.
// - O custo do Repeat não tem recursos: é descartar 1 carta (outra que não esta, que já está sendo jogada), escolhida e
//   paga ao jogar (820.1.c.1, 820.2). A segunda execução escolhe o próprio alvo (820.2.a); no mesmo alvo os valores de
//   Assault somam (807.2). Motor: CardScript.repeatExtra.
registerCard({
  code: 'UNL-017',
  repeat: NO_COST,
  repeatExtra: {
    label: 'descartar 1',
    canPay: (g, self, p) => g.pl[p].hand.some((id) => id !== self.id),
    pay: function* (c) {
      const g = c.g;
      const hand = g.pl[c.p].hand.filter((id) => id !== c.self.id).map((id) => g.objs[id]);
      if (!hand.length) return false;
      const [pick] = yield* g.chooseObj(c.p, 'Square Up — Repeat: descarte 1', hand);
      g.discardObjs(c.p, [pick]);
      return true;
    },
  },
  spell: {
    label: 'Square Up',
    targets: [{ prompt: 'Square Up: dar [Assault 4] a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      c.g.giveKw(u, { assault: 4 });
      c.g.say(`${c.g.name(u)} recebe [Assault 4] neste turno.`, c.p);
    },
  },
});
