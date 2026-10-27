import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Action: escolha uma unidade inimiga num campo. Assuma o controle dela e chame-a de volta (recall) para a sua base.
// Só a unidade muda de controle: equipamentos presos continuam do controlador antigo e presos a ela
// (riftjudge FAQ #11518 e #43; regra 107.1.c.1).
registerCard({
  code: 'OGN-203',
  keywords: { action: true },
  spell: {
    label: 'Possession',
    targets: [{ prompt: 'Possession: controlar qual unidade inimiga num campo?', filter: (c, o) => o.controller !== c.p && atBf(c, o) }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      u.controller = c.p;
      g.recall(u);
      g.say(`${g.pname(c.p)} assume o controle de ${g.name(u)}, que vai para a base (recall).`, c.p);
    },
  },
});
