import { registerCard } from '../../engine/script';
import type { Loc, Obj } from '../../engine/types';

// Quando eu ataco, você pode revelar as 2 cartas do topo do seu deck principal. Você pode banir uma delas e então
// jogá-la. Se for uma unidade, você pode jogá-la aqui. Recicle o resto. (errata de 14/01/2026)
// - "Você pode revelar": decidido ao pôr o gatilho na pilha (383.3.a); o resto é decidido na resolução (383.3.a.3).
// - Revelar passa por Engine.revealTop (Void Hatchling, Nocturne pode ser banida, Undertitan adiciona [2]).
// - "Jogá-la" paga o custo normal (com os custos adicionais e descontos, 419.3.b); sem ignorar o timing. Se não der
//   para jogar, a carta fica banida (o banimento da errata serve para isso: RiftJudge #447, #2978).
// - Unidade: pode ir para a sua base, um campo que você controla ou "aqui" — o campo onde estou atacando, mesmo sem
//   controlá-lo (FAQ #612). "Aqui" é o meu local na resolução (359.3.f.2).
// - Só dispara quando ganho a designação de atacante num combate (não num showdown sem combate: FAQ #9415, #10463).
registerCard({
  code: 'SFD-170',
  triggers: [
    {
      on: 'attack',
      label: 'Revelar 2, banir e jogar uma',
      optional: 'Revelar as 2 cartas do topo do seu deck?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const top = yield* g.revealTop(c.p, 2); // Void Hatchling, Nocturne, Undertitan
        if (!top.length) return;
        const costLabel = (o: Obj) => {
          const cost = g.effectCost(c.p, o, g.printedCost(o));
          return `${g.name(o)} (${g.costText(cost)}${g.canPay(c.p, cost, g.kind(o) === 'spell') ? '' : ' — sem recursos agora'})`;
        };
        const pickIds = yield* g.ask(
          c.p,
          'choose',
          `Rek'Sai: banir uma carta revelada e jogá-la? (${top.map((o) => g.name(o)).join(', ')})`,
          top.map((o) => ({ id: o.id, label: costLabel(o), obj: o.id })),
          0,
          1,
        );
        const pick = pickIds.length ? g.objs[pickIds[0]] : null;
        if (pick) {
          g.banishObj(pick);
          let loc: Loc | undefined;
          if (g.isUnit(pick)) {
            // locais: base, campos que você controla e "aqui" (o campo onde Rek'Sai está)
            const locs: Loc[] = [{ t: 'base', p: c.p }];
            g.bfs.forEach((b, i) => b.controller === c.p && locs.push({ t: 'bf', i }));
            const here = c.self.zone === 'board' ? c.self.loc : undefined;
            if (here && !locs.some((l) => g.locEq(l, here))) locs.push(here);
            const ok = locs.filter((l) => g.playLocOk(c.p, pick, l));
            if (ok.length) {
              const [k] = yield* g.ask(
                c.p,
                'choose',
                `Jogar ${g.name(pick)} onde?`,
                ok.map((l, j) => ({ id: String(j), label: g.locName(l) + (here && g.locEq(l, here) ? ' (aqui)' : '') })),
              );
              loc = ok[Number(k)];
            }
          }
          if (!g.isUnit(pick) || loc) yield* g.playFromEffect(c.p, pick, g.printedCost(pick), loc);
          if (pick.zone === 'banish') g.say(`${g.name(pick)} não foi jogada e fica banida.`);
        }
        const rest = top.filter((o) => o !== pick && o.zone === 'mainDeck');
        yield* g.recycleCards(rest);
        if (rest.length) g.say(`${g.pname(c.p)} recicla ${rest.length} carta(s).`, c.p);
      },
    },
  ],
});
