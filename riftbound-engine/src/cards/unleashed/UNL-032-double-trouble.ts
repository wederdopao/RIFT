import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Gen, Obj, P } from '../../engine/types';
import { E } from '../helpers';

/**
 * "Olhe as 3 cartas do topo do seu Main Deck. Você pode revelar uma unidade dentre elas e comprá-la. Recicle o resto."
 * Olhar o topo passa por lookAtTop (Nocturne); revelar a unidade passa pela substituição "se você fosse revelar" (Void
 * Hatchling) e pelo "As I'm revealed" da carta — o mesmo caminho do Ornn, Blacksmith (SFD-058). As recicladas vão
 * juntas para o fundo em ordem aleatória (416.5). Retorna a carta revelada (ou undefined). Usado também por Ivern.
 */
export function* lookRevealUnit(g: Engine, p: P, label: string): Gen<Obj | undefined> {
  const top = (yield* g.lookAtTop(p, g.pl[p].mainDeck.slice(0, 3))).map((id) => g.objs[id]);
  if (!top.length) return undefined;
  const units = top.filter((o) => g.isUnit(o));
  let pick: Obj | undefined;
  if (units.length) [pick] = yield* g.chooseObj(p, `${label}: revelar e comprar qual unidade? (opcional)`, units, 0, 1);
  const gone = new Set<Obj>();
  let revealed: Obj | undefined;
  if (pick) {
    const before = g.pl[p].mainDeck[0];
    yield* g.beforeReveal(p, p);
    // a carta do topo reciclada pela substituição já foi para o fundo: não é reciclada de novo
    if (g.pl[p].mainDeck[0] !== before && before) gone.add(g.objs[before]);
    if (!gone.has(pick)) {
      revealed = pick;
      g.say(`${g.pname(p)} revela ${g.name(pick)}.`, p);
      yield* g.onRevealG([pick], p); // "As I'm revealed" da carta revelada
    }
  }
  if (revealed && revealed.zone === 'mainDeck') {
    g.say(`${g.pname(p)} compra ${g.name(revealed)}.`, p);
    g.toZone(revealed, 'hand');
    g.emit({ type: 'draw', player: p, obj: revealed });
  }
  yield* g.recycleCards(top.filter((o) => o !== pick && !gone.has(o) && o.zone === 'mainDeck'), { by: p });
  return revealed;
}

// [Repeat 2] (= Repeat [2]). Olhe as 3 do topo, pode revelar uma unidade e comprá-la, recicle o resto. Com o Repeat
// pago, tudo de novo (820).
registerCard({
  code: 'UNL-032',
  repeat: E(2),
  spell: {
    label: 'Double Trouble',
    resolve: function* (c) {
      yield* lookRevealUnit(c.g, c.p, 'Double Trouble');
    },
  },
});
