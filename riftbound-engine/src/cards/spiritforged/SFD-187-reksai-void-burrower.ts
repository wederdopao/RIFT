import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';
// Lenda (com errata): quando você conquista, você pode me exaurir para revelar as 2 cartas do topo do seu deck. Você
// pode banir uma delas e então jogá-la. Recicle o resto.
// - Exaurir é o custo do gatilho, pago ao pô-lo na pilha (regra 383.3.b).
// - Jogar a carta banida exige pagar o custo dela normalmente (RiftJudge #9823, #10344: só "ignorando o custo" a
//   deixa de graça); o momento do jogo é ignorado por ser jogada por efeito. Se não der para jogá-la (sem recursos ou
//   sem alvo), ela fica banida: o banir é justamente o lugar onde a carta fica se não puder ser jogada (FAQ oficial do
//   Spiritforged, errata de Void Rush/Rek'Sai).
// - Com menos de 2 cartas no deck, revela o que houver, sem Burn Out (regra 431.1.c).
registerCard({
  code: 'SFD-187',
  triggers: [
    {
      on: 'conquer',
      label: 'Revelar as 2 do topo, banir e jogar uma, reciclar o resto',
      optional: 'Exaurir Rek\'Sai para revelar as 2 cartas do topo do seu deck?',
      cond: (c, ev) => ev.player === c.p && !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const cards = yield* g.revealTop(c.p, 2); // inclui substituições de revelar (Void Hatchling) e onReveal
        if (!cards.length) return;
        const [pick] = yield* g.ask(c.p, 'choose', "Rek'Sai: banir qual carta para jogá-la (pagando o custo)?", [
          ...cards.map((o) => ({ id: o.id, label: g.name(o), obj: o.id })),
          { id: 'none', label: 'Nenhuma' },
        ]);
        const chosen: Obj | undefined = pick !== 'none' ? g.objs[pick] : undefined;
        if (chosen && chosen.zone === 'mainDeck') {
          g.banishObj(chosen);
          yield* g.playFromEffect(c.p, chosen, g.printedCost(chosen));
          if ((chosen.zone as string) === 'banish') g.say(`${g.name(chosen)} não pôde ser jogada e fica banida.`, c.p);
        }
        const rest = cards.filter((o) => o !== chosen && o.zone === 'mainDeck');
        yield* g.recycleCards(rest, { by: c.p });
      },
    },
  ],
});
