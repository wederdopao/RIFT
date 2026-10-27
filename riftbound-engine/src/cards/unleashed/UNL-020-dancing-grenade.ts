import { registerCard } from '../../engine/script';
import { DOMAINS, type Cost } from '../../engine/types';

// Dancing Grenade. Cause 2 de dano a uma unidade. O controlador dela pode jogar este spell de novo por [A]. Se jogar, este
// causa 1 de Bonus Damage a mais para cada vez que este spell causou dano neste turno.
// - Quem decide é quem controla a unidade atingida (pode ser o oponente), na resolução; ele escolhe o novo alvo e paga
//   [A] (power de qualquer domínio; "por [custo]" substitui o custo base, 356.1.a), com Deflect e descontos normais.
// - O spell é jogado de novo direto da pilha e continua nela até o ciclo parar (RiftJudge #13006, corrigida); só então
//   vai para o descarte (ou é reciclado pelo Fizz, que vale quando ele finalmente sai da pilha). Motor: resolveTop não
//   tira da pilha a carta jogada de novo.
// - Sem limite: 2, 3, 4, 5... enquanto alguém pagar [A] e houver alvo (RiftJudge #11581).
// - A contagem é deste objeto: começa do zero quando a carta é jogada de outro jeito (outra jogada é outro objeto) e
//   segue pelas jogadas "de novo" (dgChain = id do item da jogada original). Toda execução que causa dano conta,
//   inclusive a repetição de um [Repeat] dado por efeito (Temporal Portal, Syndra): "each time this spell has dealt damage".
const AGAIN: Cost = { energy: 0, power: [[...DOMAINS]] };
registerCard({
  code: 'UNL-020',
  spell: {
    label: 'Dancing Grenade',
    targets: [{ prompt: 'Dancing Grenade: 2 de dano em qual unidade?' }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      const d = (c.self.data ||= {});
      const replay = !!c.data.dgReplay;
      const chain: string | undefined = c.data.dgChain ?? c.item?.id;
      const hits = d.dgHits?.turn === g.turn && d.dgHits.chain === chain ? d.dgHits.n : 0;
      const dealt = g.dealDamage(u, 2 + (replay ? hits : 0), c.self);
      d.dgHits = { turn: g.turn, chain, n: hits + (dealt > 0 ? 1 : 0) };
      // "O controlador dela pode jogar este spell de novo por [A]"
      if (c.self.zone !== 'chain' || u.zone !== 'board') return;
      // já jogado de novo por esta jogada (1ª execução de um [Repeat]): está na pilha como a jogada nova, outro objeto
      // (124.1); "este spell" não existe mais para a repetição jogar outra vez (revisão UNL fury)
      if (g.chain.some((x) => x.cardId === c.self.id)) return;
      const q = u.controller;
      const sc = g.script(c.self).spell!;
      const pc = g.ctx(c.self, q);
      if (!g.canPay(q, g.effectCost(q, c.self, AGAIN), true) || !g.hasLegalTargets(sc, pc)) return;
      if (!(yield* g.yesNo(q, `Dancing Grenade: jogar o spell de novo por [A]? (próximo dano: ${2 + d.dgHits.n})`))) return;
      yield* g.playFromEffect(q, c.self, AGAIN, undefined, { recycleAfter: c.item?.recycleAfter, data: { dgReplay: true, dgChain: chain } });
    },
  },
});
