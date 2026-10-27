import { registerCard } from '../../engine/script';

// Ganking. Recicle 1 do seu descarte: +1 de Might neste turno.
registerCard({
  code: 'OGN-036',
  keywords: { ganking: true },
  activated: [
    {
      label: 'Reciclar 1 do descarte: +1 de Might',
      canPayExtra: (c) => c.g.pl[c.p].trash.length > 0,
      extraCost: function* (c) {
        const trash = c.g.pl[c.p].trash.map((id) => c.g.objs[id]);
        if (!trash.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Reciclar qual carta do seu descarte?', trash);
        c.g.recycleCard(o);
        return true;
      },
      resolve: function* (c) {
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
