import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { xpCost } from '../helpers';

// [Hunt]. Quando eu ataco, você pode gastar 3 XP para causar dano igual ao meu Might a uma unidade inimiga aqui.
// - "Você pode gastar 3 XP para..." no início do efeito: custo dentro das instruções, pago ao pôr o gatilho na pilha
//   (383.3.b, 383.3.b.1; riftboundfaq.com, Abilities #costs-within-instructions). Sem 3 XP não há como aceitar. A
//   unidade inimiga é alvo escolhido nessa hora (o XP não é alvo, 355.10.c.1).
// - "Aqui" e o meu Might são da resolução (359.3.f.2): se eu saí do campo ou do tabuleiro, o alvo fica inválido e não há
//   dano (como Ezreal, Dashing; RiftJudge #11563). O dano é da habilidade (Bonus Damage vale).
const SPEC = {
  prompt: "Kha'Zix: causar dano igual ao meu Might em qual unidade inimiga aqui?",
  filter: (c: Ctx, o: Obj) => o.controller !== c.p && c.self.zone === 'board' && c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
};
registerCard({
  code: 'UNL-119',
  keywords: { hunt: 1 },
  triggers: [
    {
      on: 'attack',
      label: 'Gastar 3 XP: dano igual ao meu Might numa unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      // sem 3 XP o motor nem põe o gatilho (xpCost); sem alvo, não pergunta
      ...xpCost(3),
      prepare: function* (c) {
        const g = c.g;
        if (!g.targetCandidates(c, SPEC).length) return false;
        return yield* g.yesNo(c.p, `${g.name(c.self)}: gastar 3 XP para causar dano igual ao meu Might a uma unidade inimiga aqui?`);
      },
      targets: [SPEC],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || c.self.zone !== 'board') return;
        const n = c.g.might(c.self);
        if (n > 0) c.g.dealDamage(u, n, c.self);
      },
    },
  ],
});
