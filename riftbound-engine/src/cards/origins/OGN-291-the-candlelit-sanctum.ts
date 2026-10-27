import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você conquista aqui, olhe as 2 cartas do topo do seu deck. Você pode reciclar uma ou as duas.
// As que ficarem voltam ao topo na ordem que você quiser.
registerCard({
  code: 'OGN-291',
  triggers: [
    {
      on: 'conquer',
      label: 'Olhar as 2 do topo, reciclar e reordenar',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const s = g.pl[c.p];
        // olhar o topo dispara os efeitos "ao olhar" (Nocturne, Horrifying); as que saírem do deck não contam mais
        const top = yield* g.lookAtTop(c.p, s.mainDeck.slice(0, 2));
        if (!top.length) return;
        const rec = yield* g.ask(
          c.p,
          'choose',
          'The Candlelit Sanctum: quais cartas do topo reciclar? (as outras voltam ao topo)',
          top.map((id) => ({ id, label: g.name(id), obj: id })),
          0,
          top.length,
        );
        yield* g.recycleCards(rec.map((id) => g.objs[id])); // as duas ao mesmo tempo: ordem aleatória (416.5)
        const rest = top.filter((id) => !rec.includes(id));
        if (rest.length === 2) {
          const [first] = yield* g.ask(
            c.p,
            'choose',
            'The Candlelit Sanctum: qual carta fica no topo do deck?',
            rest.map((id) => ({ id, label: g.name(id), obj: id })),
          );
          // as duas voltam para o topo, na ordem escolhida
          const second = rest.find((id) => id !== first)!;
          s.mainDeck = [first, second, ...s.mainDeck.filter((id) => id !== first && id !== second)];
        }
        g.say(`${g.pname(c.p)} olha o topo do deck${rec.length ? ` e recicla ${rec.length}` : ''}.`, c.p);
      },
    },
  ],
});
