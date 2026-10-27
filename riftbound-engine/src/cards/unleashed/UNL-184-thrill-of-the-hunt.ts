import { registerCard } from '../../engine/script';
import { NO_COST, type Loc, type P } from '../../engine/types';
// Signature Spell (Rengar): [Reaction]. Bana uma unidade aliada; então o dono dela a joga em qualquer campo, ignorando o custo.
// - A unidade é alvo (escolhida ao jogar). Ficha banida deixa de existir (185) e não tem o que jogar.
// - O dono joga a carta do banimento num campo à escolha dele — qualquer campo, inclusive um que ele não controla
//   (RiftJudge #9777; isso disputa o campo e pode abrir showdown/combate, #11616). "Ignorando o custo": custo base 0;
//   custos adicionais (Accelerate) continuam opcionais. Entra exausta salvo efeito que a prepare (RiftJudge #10792).
// - Sem campo onde possa jogá-la (Mageseeker Warden...), a jogada não acontece e a carta fica banida (358.3.a).
registerCard({
  code: 'UNL-184',
  keywords: { reaction: true },
  spell: {
    label: 'Thrill of the Hunt',
    targets: [{ prompt: 'Thrill of the Hunt: banir qual unidade aliada?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      const owner: P = u.owner;
      g.banishObj(u);
      if ((u.zone as string) !== 'banish') return; // ficha: deixou de existir
      const locs: Loc[] = g.bfs.map((_, i) => ({ t: 'bf', i }) as Loc).filter((l) => g.playLocOk(owner, u, l));
      if (!locs.length) return g.say(`${g.pname(owner)} não tem campo onde jogar ${g.name(u)}; ela fica banida.`, owner);
      const [k] = yield* g.ask(
        owner,
        'choose',
        `Thrill of the Hunt: jogar ${g.name(u)} em qual campo?`,
        locs.map((l, j) => ({ id: String(j), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      yield* g.playFromEffect(owner, u, NO_COST, locs[Number(k)]);
    },
  },
});
