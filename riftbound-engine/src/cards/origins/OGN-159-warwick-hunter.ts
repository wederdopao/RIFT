import { registerCard } from '../../engine/script';

// Entro pronto. Quando eu ataco, mate todas as unidades inimigas com dano aqui.
registerCard({
  code: 'OGN-159',
  entersReady: () => true,
  triggers: [
    {
      on: 'attack',
      label: 'Matar as unidades inimigas com dano aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const i = c.g.bfIndex(c.self);
        if (c.self.zone !== 'board' || i < 0) return;
        const us = c.g.unitsAtBf(i).filter((u) => u.controller !== c.p && u.damage > 0);
        if (!us.length) c.g.say('Warwick: nenhuma unidade inimiga com dano aqui.');
        yield* c.g.killG(us); // "mate todas": uma ação só, mortes simultâneas (370.1.a.2)
      },
    },
  ],
});
