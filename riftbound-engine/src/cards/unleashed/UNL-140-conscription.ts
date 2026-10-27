import { registerCard } from '../../engine/script';
import { xpOptionalCost } from '../helpers';

// Spell. Você pode gastar 5 XP como custo adicional para jogar isto. Escolha uma unidade inimiga num campo de batalha com
// 3 de Might ou menos. Se você pagou o custo adicional, escolha qualquer unidade inimiga num campo em vez disso. Assuma o
// controle dela, exaura-a e chame-a de volta (recall).
// - O custo adicional opcional é decidido antes dos alvos (355.1.a, 355.5); a restrição "3 de Might ou menos" vale ao
//   escolher e de novo na resolução (359.3.e), salvo se o custo foi pago.
// - Controle permanente da unidade; equipamentos presos continuam com quem os controla e presos a ela, e vão junto para
//   a base (RiftJudge #10185; 718.5.e). Recall não é movimento (455) e não dá conquista (RiftJudge #10450).
registerCard({
  code: 'UNL-140',
  optionalCosts: [
    xpOptionalCost(5, 'paid', 'Gastar 5 XP como custo adicional (para poder escolher qualquer unidade inimiga num campo)?'),
  ],
  spell: {
    label: 'Conscription',
    // marca que o custo adicional já foi decidido (vem antes dos alvos); antes disso (dá para jogar?), conta com a
    // possibilidade de pagá-lo
    prepare: function* (c) {
      c.data.decided = true;
      return true;
    },
    targets: [
      {
        prompt: 'Conscription: assumir o controle de qual unidade inimiga num campo?',
        filter: (c, o) =>
          o.controller !== c.p && c.g.bfIndex(o) >= 0 && (!!c.data.paid || c.g.might(o) <= 3 || (!c.data.decided && c.g.canSpendXp(c.p, 5))),
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      u.controller = c.p;
      g.say(`${g.pname(c.p)} assume o controle de ${g.name(u)}.`, c.p);
      g.exhaust(u);
      g.recall(u);
      g.say(`${g.name(u)} é exaurida e chamada de volta para a base de ${g.pname(c.p)}.`, c.p);
    },
  },
});
