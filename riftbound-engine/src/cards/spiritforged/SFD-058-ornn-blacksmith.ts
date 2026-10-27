import { registerCard } from '../../engine/script';
import type { AbilityDef } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Quando você me joga ou quando eu seguro (hold): olhe as 4 cartas do topo do seu Main Deck. Você pode revelar um gear
// dentre elas e comprá-lo. Depois recicle o resto (juntas: fundo do deck em ordem aleatória, regra 416.5).
// Olhar o topo passa por lookAtTop (Nocturne, Horrifying).
const LOOK: AbilityDef = {
  label: 'Olhar 4 do topo: comprar um gear e reciclar o resto',
  resolve: function* (c) {
    const g = c.g;
    const top = (yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 4))).map((id) => g.objs[id]);
    if (!top.length) return;
    const gears = top.filter((o) => g.isGear(o));
    let pick: Obj | undefined;
    if (gears.length) [pick] = yield* g.chooseObj(c.p, 'Ornn: revelar e comprar qual gear? (opcional)', gears, 0, 1);
    // revelar uma carta do deck: substituição "se você fosse revelar cartas de um deck" (Void Hatchling) antes
    const gone = new Set<Obj>();
    if (pick) {
      const before = g.pl[c.p].mainDeck[0];
      yield* g.beforeReveal(c.p, c.p);
      // a carta do topo reciclada pela substituição já foi para o fundo: não é reciclada de novo
      if (g.pl[c.p].mainDeck[0] !== before && before) gone.add(g.objs[before]);
      if (!gone.has(pick)) yield* g.onRevealG([pick], c.p); // "As I'm revealed" da carta revelada
    }
    if (pick && pick.zone === 'mainDeck' && !gone.has(pick)) {
      g.say(`${g.pname(c.p)} revela ${g.name(pick)} e compra.`, c.p);
      g.toZone(pick, 'hand');
      g.emit({ type: 'draw', player: c.p, obj: pick });
    }
    yield* g.recycleCards(top.filter((o) => o !== pick && !gone.has(o) && o.zone === 'mainDeck'), { by: c.p });
  },
};
registerCard({
  code: 'SFD-058',
  onPlay: [LOOK],
  triggers: [
    {
      ...LOOK,
      on: 'hold',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
    },
  ],
});
