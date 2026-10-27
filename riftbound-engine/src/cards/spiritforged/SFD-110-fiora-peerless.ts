import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Quando eu ataco ou defendo um contra um, dobre o meu Might neste combate.
// - Um contra um: eu e a unidade inimiga no mesmo local estamos sozinhas (regra 740.2.b).
// - A condição é checada só quando eu recebo a designação de atacante/defensora (regras 383.4.e.2.b e 383.4.f.2.b;
//   FAQ riftjudge #11502); depois, o gatilho resolve mesmo que entre outra unidade (FAQ riftjudge #11203 e #11178).
// - Dobrar = somar o Might atual na resolução (regra 432.1).
registerCard({
  code: 'SFD-110',
  triggers: [
    {
      on: ['attack', 'defend'],
      label: 'Um contra um: dobrar meu Might neste combate',
      cond: (c, ev) => {
        if (ev.unit?.id !== c.self.id) return false;
        const i = c.g.bfIndex(c.self);
        if (i < 0) return false;
        return c.g.unitsAtBf(i, c.self.controller).length === 1 && c.g.unitsAtBf(i, (1 - c.self.controller) as P).length === 1;
      },
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        const m = c.g.might(c.self);
        if (m) c.g.giveMight(c.self, m, 'combat');
      },
    },
  ],
});
