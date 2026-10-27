import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';
// Spell (com errata): revele as 2 cartas do topo do seu deck. Você pode banir uma delas e então jogá-la, reduzindo o
// custo dela em [2]. Compre as que você não baniu.
// - A carta banida é jogada pagando o custo (com o desconto de [2] de energia); se não puder ser jogada, fica banida
//   (FAQ oficial do Spiritforged: o banir guarda a carta que não pode ser jogada).
// - "Compre as que não baniu": as próprias cartas reveladas vão para a mão (é compra). Com menos de 2 no deck, revela
//   o que houver, sem Burn Out (regra 431.1.c).
registerCard({
  code: 'SFD-188',
  spell: {
    label: 'Void Rush',
    resolve: function* (c) {
      const g = c.g;
      const cards = yield* g.revealTop(c.p, 2); // inclui substituições de revelar (Void Hatchling) e onReveal
      if (!cards.length) return;
      const [pick] = yield* g.ask(c.p, 'choose', 'Void Rush: banir qual carta para jogá-la com [2] de desconto?', [
        ...cards.map((o) => ({ id: o.id, label: g.name(o), obj: o.id })),
        { id: 'none', label: 'Nenhuma' },
      ]);
      const chosen: Obj | undefined = pick !== 'none' ? g.objs[pick] : undefined;
      if (chosen && chosen.zone === 'mainDeck') {
        g.banishObj(chosen);
        yield* g.playFromEffect(c.p, chosen, g.printedCost(chosen), undefined, { discount: 2 });
        if ((chosen.zone as string) === 'banish') g.say(`${g.name(chosen)} não pôde ser jogada e fica banida.`, c.p);
      }
      const rest = cards.filter((o) => o !== chosen && o.zone === 'mainDeck');
      for (const o of rest) {
        g.toZone(o, 'hand');
        g.emit({ type: 'draw', player: c.p, obj: o });
      }
      if (rest.length) g.say(`${g.pname(c.p)} compra ${rest.length}.`, c.p);
    },
  },
});
