import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Quando uma unidade aliada sai do meu local, eu posso ir junto com ela.
// Gatilho que usa a pilha (regra 383.1; riftjudge FAQ #8377 e #3344). Cada unidade aliada que sai dispara uma vez.
// "Posso" não é "you may" no começo do efeito (383.3.a), então a escolha é feita na resolução (FAQ #8377); vou
// para o local atual da unidade, e se ela saiu do tabuleiro não há para onde ir.
registerCard({
  code: 'OGN-177',
  triggers: [
    {
      on: 'move',
      label: 'Ir junto com a unidade aliada',
      cond: (c, ev) => {
        const u: Obj | undefined = ev.unit;
        if (!u || u.id === c.self.id || u.controller !== c.p) return false;
        return c.g.locEq(c.self.loc, ev.from);
      },
      resolve: function* (c) {
        const g = c.g;
        const u: Obj = c.ev!.unit;
        if (c.self.zone !== 'board' || u.zone !== 'board' || g.locEq(c.self.loc, u.loc)) return;
        if (!(yield* g.yesNo(c.p, `Stealthy Pursuer: ir junto com ${g.name(u)} para ${g.locName(u.loc)}?`))) return;
        g.moveUnits([c.self], u.loc!, c.p);
      },
    },
  ],
});
