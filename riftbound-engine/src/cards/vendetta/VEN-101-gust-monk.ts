import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import { E, T } from '../helpers';

// VEN-101 Gust Monk: "You may pay [1] as an additional cost to play me. When you play me, if you paid the additional
// cost, banish a card from any trash to give a unit [Assault 2] this turn."
// "banish a card from any trash to ..." é custo dentro da instrução no começo do efeito do gatilho: pago ao pô-lo na
// pilha (Core Rules 204.3.a, 740.4.a.2) e não é alvo (355.10.c.1); sem carta em nenhum descarte, o gatilho não vai
// para a pilha. A unidade é alvo, escolhida ao finalizar.
const trashCards = (g: Engine) => [...g.pl[0].trash, ...g.pl[1].trash].map((id) => g.objs[id]);

registerCard({
  code: 'VEN-101',
  optionalCosts: [{ label: 'Pagar [1] a mais (Assault 2 numa unidade)?', cost: E(1), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Gust Monk: banir uma carta de um descarte para dar Assault 2',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [T.anyUnit('Gust Monk: Assault 2 em qual unidade?')],
      canPayExtra: (c) => trashCards(c.g).length > 0,
      extraCost: function* (c) {
        const g = c.g;
        const cards = trashCards(g);
        if (!cards.length) return false;
        const [pick] = yield* g.chooseObj(c.p, 'Gust Monk: banir qual carta de um descarte?', cards);
        if (!pick) return false;
        g.banishObj(pick);
        return true;
      },
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveKw(u, { assault: 2 });
      },
    },
  ],
});
