import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Caos]. Efeito (vale para a unidade equipada): quando eu conquisto, jogue uma ficha de gear Gold exaurida.
// O texto de efeito é acrescentado ao da unidade (regra 136.2.c): "eu" é a unidade, "você" quem a controla.
registerCard({
  code: 'SFD-134',
  equipCost: E(0, 'Chaos'),
  // texto de efeito (CardScript.equipped): c.self = a unidade equipada, c.p = quem a controla
  equipped: {
    triggers: [
      {
        on: 'conquer',
        label: 'Ficha Gold exaurida',
        cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
        resolve: function* (c) {
          c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
        },
      },
    ],
  },
});
