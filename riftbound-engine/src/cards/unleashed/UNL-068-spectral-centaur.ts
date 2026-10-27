import { registerCard } from '../../engine/script';

// Quando outra unidade aliada morre, eu ganho +2 de Might neste turno.
// Might 5 e tags Shadow Isles + Spirit (arte UNL-068 e catálogo oficial da Riot; o ref/cards.json trazia 6 e sem Spirit:
// corrigido em src/data/cards.json).
// "Aliada" = controlada por quem me controla no momento da morte. Se eu morro junto (mesma ação), não disparo (383.2.c.2).
registerCard({
  code: 'UNL-068',
  triggers: [
    {
      on: 'die',
      label: '+2 de Might neste turno',
      cond: (c, ev) => !!ev.obj && ev.obj.id !== c.self.id && ev.controller === c.p && c.g.isUnit(ev.obj),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 2);
      },
    },
  ],
});
