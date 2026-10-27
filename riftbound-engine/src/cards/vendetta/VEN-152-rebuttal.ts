import { registerCard } from '../../engine/script';
import { E, newChoices } from '../helpers';
// VEN-152 Rebuttal
// "Choose a spell with Energy cost no more than [4]. You may pay [Rune]. If you do, gain control of it and you may make new
// choices for it. Otherwise, counter it." — novas escolhas como Mystic Reversal (helpers.newChoices, regras 751-755).
registerCard({
  code: 'VEN-152',
  keywords: { reaction: true },
  spell: {
    label: 'Rebuttal',
    targets: [{ prompt: 'Rebuttal: qual spell com custo de energia até 4?', kind: 'spell', filter: (c, o) => o.id !== c.self.id && c.g.data(o).energy <= 4 }],
    resolve: function* (c) {
      const g = c.g;
      const s = c.targets[0][0];
      const item = s && g.chain.find((it) => it.cardId === s.id);
      if (!s || !item) return;
      const cost = E(0, 'any');
      if (g.canPay(c.p, cost) && (yield* g.yesNo(c.p, `Rebuttal: pagar [Rune] para ganhar o controle de ${g.name(s)}? (senão, anulá-lo)`))) {
        yield* g.payG(c.p, cost);
        item.playedBy ??= item.controller;
        item.controller = c.p;
        item.ctx.p = c.p;
        s.controller = c.p;
        g.say(`${g.pname(c.p)} ganha o controle de ${g.name(s)}.`, c.p);
        yield* newChoices(c, item, 'Rebuttal');
      } else g.counter(item);
    },
  },
});
