import { registerCard } from '../../engine/script';

// Unidade 5. Quando outra unidade aliada morre, ganhe 1 XP.
// - Se eu morro na mesma ação, não disparo (383.2.c.2, exemplo de Viktor, Leader). Cada morte dispara à parte; fichas
//   também contam.
registerCard({
  code: 'UNL-129',
  triggers: [
    {
      on: 'die',
      label: 'Ganhar 1 XP',
      cond: (c, ev) => !!ev.obj && ev.obj.id !== c.self.id && ev.controller === c.p && c.g.isUnit(ev.obj),
      resolve: function* (c) {
        c.g.gainXp(c.p, 1);
      },
    },
  ],
});
