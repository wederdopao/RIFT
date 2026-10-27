import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Mind]. Texto de efeito (vale para a unidade equipada): "Quando eu seguro (hold), jogue duas fichas de gear Gold
// exauridas." O texto é acrescentado ao da unidade (434.1.c): "eu" é a unidade e "você" quem a controla (718.5.e). Fora
// de anexado, o texto de efeito é inativo (724). +2 de Might Bonus impresso (o motor soma).
registerCard({
  code: 'SFD-086',
  equipCost: E(0, 'Mind'),
  // texto de efeito: c.self = a unidade equipada, c.p = quem a controla
  equipped: {
    triggers: [
      {
        on: 'hold',
        label: 'Jogar duas fichas de Gold',
        cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
        resolve: function* (c) {
          for (let i = 0; i < 2; i++) c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
        },
      },
    ],
  },
});
