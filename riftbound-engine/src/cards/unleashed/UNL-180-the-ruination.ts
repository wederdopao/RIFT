import { registerCard } from '../../engine/script';

// Mate todas as unidades. (Não é escolha: todas morrem juntas na mesma ação, 370.1.a.2.)
registerCard({
  code: 'UNL-180',
  spell: {
    label: 'The Ruination',
    resolve: function* (c) {
      const us = c.g.units();
      if (us.length) yield* c.g.killG(us);
    },
  },
});
