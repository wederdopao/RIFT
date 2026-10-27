import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Quando você me joga, olhe as 4 cartas do topo do seu Main Deck. Você pode revelar um spell com custo de energia [4]
// ou mais dentre elas e comprá-lo. Recicle o resto (juntas: fundo do deck em ordem aleatória, regra 416.5).
// Mesmo caminho do Ornn, Blacksmith: olhar passa por lookAtTop (Nocturne); revelar passa pela substituição "se você
// fosse revelar cartas de um deck" (Void Hatchling) e pelo "As I'm revealed" da carta. Custo de energia = o impresso.
registerCard({
  code: 'UNL-064',
  onPlay: [
    {
      label: 'Olhar 4 do topo: comprar um spell de [4]+ e reciclar o resto',
      resolve: function* (c) {
        const g = c.g;
        const top = (yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 4))).map((id) => g.objs[id]);
        if (!top.length) return;
        const spells = top.filter((o) => g.kind(o) === 'spell' && g.data(o).energy >= 4);
        let pick: Obj | undefined;
        if (spells.length) [pick] = yield* g.chooseObj(c.p, 'Fate Weaver: revelar e comprar qual spell de custo [4] ou mais? (opcional)', spells, 0, 1);
        const gone = new Set<Obj>();
        if (pick) {
          const before = g.pl[c.p].mainDeck[0];
          yield* g.beforeReveal(c.p, c.p);
          // a carta do topo reciclada pela substituição já foi para o fundo: não é reciclada de novo
          if (g.pl[c.p].mainDeck[0] !== before && before) gone.add(g.objs[before]);
          if (!gone.has(pick)) yield* g.onRevealG([pick], c.p);
        }
        if (pick && pick.zone === 'mainDeck' && !gone.has(pick)) {
          g.say(`${g.pname(c.p)} revela ${g.name(pick)} e compra.`, c.p);
          g.toZone(pick, 'hand');
          g.emit({ type: 'draw', player: c.p, obj: pick });
        }
        yield* g.recycleCards(top.filter((o) => o !== pick && !gone.has(o) && o.zone === 'mainDeck'), { by: c.p });
      },
    },
  ],
});
