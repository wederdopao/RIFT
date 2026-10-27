import { registerCard } from '../../engine/script';

// VEN-113 Kennen, Storm of Shuriken
// "When I conquer, give a spell in your trash [Flow] equal to its cost this turn." — g.grantFlow: permissão de jogá-lo do
// descarte pelo custo dele neste turno (e bani-lo), não jogar na hora.
registerCard({
  code: 'VEN-113',
  onPlay: [
    {
      label: 'Kennen: Burn 2',
      resolve: function* (c) {
        c.g.burn(c.p, 2);
      },
    },
  ],
  triggers: [
    {
      on: 'conquer',
      label: 'Kennen: dar [Flow] a um spell do seu descarte neste turno',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        const g = c.g;
        const sp = g.pl[c.p].trash.map((id) => g.objs[id]).filter((o) => g.kind(o) === 'spell');
        if (!sp.length) return;
        const [pick] = yield* g.chooseObj(c.p, 'Kennen: dar [Flow] (pelo custo dele) a qual spell do seu descarte?', sp);
        if (pick) g.grantFlow(pick, g.printedCost(pick));
      },
    },
  ],
});
