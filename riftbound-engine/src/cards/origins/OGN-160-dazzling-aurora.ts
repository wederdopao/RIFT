import { registerCard } from '../../engine/script';
import { NO_COST, type Obj } from '../../engine/types';

// Gear: no fim do seu turno, revele cartas do topo do deck até revelar uma unidade e bana-a.
// Jogue-a ignorando o custo e recicle as outras.
// - Obrigatório; para na primeira unidade revelada, que tem de ser jogada (FAQ riftjudge #1742 e #7061 — com Nocturne,
//   Horrifying a Aurora também para nele e ele é jogado de graça).
// - Revelar não tira as cartas do deck: sem unidade, revela o deck todo e não há Burn Out (regra 431.1.c; FAQ #4270).
// - As reveladas vão para o fundo do deck em ordem aleatória (regra 416.5).
// - A unidade é jogada como se jogaria uma unidade (base, campo controlado; Deadbloom Predator num campo inimigo ocupado,
//   FAQ #5654); custos adicionais (Accelerate) continuam podendo ser pagos (regra 356.1.b.3).
registerCard({
  code: 'OGN-160',
  triggers: [
    {
      on: 'turnEnd',
      label: 'Revelar até uma unidade e jogá-la de graça',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const s = g.pl[c.p];
        yield* g.beforeReveal(c.p, c.p); // novo (SFD): "se você fosse revelar" (Void Hatchling), uma vez por instrução
        const revealed: Obj[] = [];
        let unit: Obj | null = null;
        for (const id of [...s.mainDeck]) {
          const o = g.objs[id];
          if (g.isUnit(o)) {
            unit = o;
            break;
          }
          revealed.push(o);
        }
        g.say(
          `Dazzling Aurora revela: ${[...revealed, ...(unit ? [unit] : [])].map((o) => g.name(o)).join(', ') || '(deck vazio)'}.`,
          c.p,
        );
        yield* g.onRevealG([...revealed, ...(unit ? [unit] : [])], c.p); // "ao ser revelada" (Undertitan)
        if (unit && unit.zone === 'mainDeck') {
          g.banishObj(unit);
          yield* g.playFromEffect(c.p, unit, NO_COST);
        }
        yield* g.recycleCards(revealed.filter((o) => o.zone === 'mainDeck'), { by: c.p }); // ao mesmo tempo: ordem aleatória (416.5)
      },
    },
  ],
});
