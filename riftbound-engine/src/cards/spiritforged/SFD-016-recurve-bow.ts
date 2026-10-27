import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. Equip [Fury]. Texto de efeito (da unidade equipada): quando eu ataco ou defendo, cause 2 de dano a uma
// unidade inimiga aqui.
// O texto de efeito é acrescentado ao texto da unidade (718.3): "eu" é a unidade equipada e a habilidade é do
// controlador dela (que pode ser outro, 718.5.e). "Aqui" = onde a unidade está.
registerCard({
  code: 'SFD-016',
  equipCost: E(0, 'Fury'),
  // texto de efeito (CardScript.equipped): c.self = a unidade equipada, c.p = quem a controla
  equipped: {
    triggers: [
      {
        on: ['attack', 'defend'],
        label: '2 de dano numa unidade inimiga aqui',
        cond: (c, ev) => ev.unit?.id === c.self.id,
        targets: [
          {
            prompt: 'Recurve Bow: 2 de dano em qual unidade inimiga aqui?',
            filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
          },
        ],
        resolve: function* (c) {
          const t = c.targets[0][0];
          // a fonte do dano é a habilidade da unidade equipada (718.3)
          if (t) c.g.dealDamage(t, 2, c.self.zone === 'board' ? c.self : c.gear);
        },
      },
    ],
  },
});
