import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Reciclar 3 do seu descarte, [1], exaurir: compre 1.
registerCard({
  code: 'OGN-099',
  activated: [
    {
      label: 'Reciclar 3 do descarte, [1], exaurir: comprar 1',
      exhaustSelf: true,
      cost: E(1),
      canPayExtra: (c) => c.g.pl[c.p].trash.length >= 3,
      extraCost: function* (c) {
        const g = c.g;
        const trash = g.pl[c.p].trash.map((id) => g.objs[id]);
        if (trash.length < 3) return false;
        const picked = yield* g.chooseObj(c.p, 'Garbage Grabber: reciclar quais 3 cartas do descarte?', trash, 3, 3);
        for (const o of g.rng.shuffle([...picked])) g.recycleCard(o);
        g.say(`${g.pname(c.p)} recicla 3 cartas do descarte.`, c.p);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
