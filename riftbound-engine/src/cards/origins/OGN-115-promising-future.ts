import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';

// Cada jogador olha as 5 cartas do topo do deck, bane uma delas e recicla o resto. Começando pelo próximo
// jogador, cada um joga a carta banida, ignorando o custo de energia (o power ainda é pago).
// - Ações de "cada jogador" seguem a ordem de turno, começando pelo jogador do turno; olhar o topo passa pelos ganchos
//   "ao olhar" (Nocturne, Horrifying). As recicladas vão para o fundo em ordem aleatória (regra 416.5).
// - Ignorar a energia zera só a energia-base (356.1.b.2): power, Deflect e custos adicionais continuam. Quem não pode
//   ou não quer pagar o power não joga a carta (regra 444.2.a), que fica banida.
registerCard({
  code: 'OGN-115',
  spell: {
    label: 'Promising Future',
    resolve: function* (c) {
      const g = c.g;
      const banished: Partial<Record<P, Obj>> = {};
      for (const p of [g.active, opp(g.active)] as P[]) {
        const ids = yield* g.lookAtTop(p, g.pl[p].mainDeck.slice(0, 5));
        const top = ids.map((id) => g.objs[id]);
        if (!top.length) continue;
        const [b] = yield* g.chooseObj(p, 'Promising Future: banir qual destas cartas? (você vai jogá-la; as outras são recicladas)', top);
        g.banishObj(b);
        banished[p] = b;
        for (const o of g.rng.shuffle(top.filter((x) => x !== b))) g.recycleCard(o);
      }
      // começando pelo próximo jogador (depois do jogador do turno)
      for (const p of [opp(g.active), g.active] as P[]) {
        const b = banished[p];
        if (!b || b.zone !== 'banish') continue;
        const cost = { energy: 0, power: g.printedCost(b).power };
        if (!g.canPay(p, cost, g.kind(b) === 'spell')) {
          g.say(`${g.pname(p)} não consegue pagar o power de ${g.name(b)}; a carta fica banida.`, p);
          continue;
        }
        if (cost.power.length && !(yield* g.yesNo(p, `Promising Future: pagar ${cost.power.length} power para jogar ${g.name(b)}? (se não, ela fica banida)`))) continue;
        yield* g.playFromEffect(p, b, cost);
      }
    },
  },
});
