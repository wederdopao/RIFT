import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
// Hidden, Action. Mate qualquer número de unidades num campo de batalha com Might total 4 ou menos.
// Ao jogar: escolhe o campo e depois as unidades uma a uma, respeitando o Might total (elas viram os alvos; o campo
// é só restrição, regra 355.10.b). "Qualquer número" inclui zero (regra 355.13).
// Na resolução (regra 355.11.b): se o grupo não somar mais 4 ou menos, o jogador escolhe um subconjunto que some.
// As mortes são uma ação só (regra 370.1.a.2).
const LIMIT = 4;
const mightOf = (c: Ctx, o: Obj) => Math.max(0, c.g.might(o));

registerCard({
  code: 'OGN-256',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Fox-Fire',
    prepare: function* (c) {
      const g = c.g;
      const bfs = g.bfs.map((_, i) => i).filter((i) => c.hiddenBf === undefined || i === c.hiddenBf);
      const [b] = yield* g.ask(
        c.p,
        'choose',
        'Fox-Fire: em qual campo de batalha?',
        bfs.map((i) => ({ id: String(i), label: g.name(g.bfs[i].objId), obj: g.bfs[i].objId })),
      );
      const bf = Number(b);
      // custo do spell para conferir o Deflect dos alvos (regra 355.16: não escolher alvo cujo custo não dá para pagar)
      const base = c.hiddenBf !== undefined ? { energy: 0, power: [] } : g.minCostFor(c.p, c.self, 'hand');
      const picks: string[] = [];
      let left = LIMIT;
      for (let guard = 0; guard < 50; guard++) {
        let cands = g.targetCandidates(c, {
          prompt: '',
          filter: (_cc, o) => g.bfIndex(o) === bf && !picks.includes(o.id) && mightOf(c, o) <= left,
        });
        cands = cands.filter((o) => g.canPay(c.p, g.addCost(base, g.deflectCost([[...picks, o.id]], c.p)), true));
        if (!cands.length) break;
        const [id] = yield* g.ask(c.p, 'choose', `Fox-Fire: matar qual unidade? (Might total restante: ${left})`, [
          ...cands.map((o) => ({ id: o.id, label: g.describe(o), obj: o.id })),
          { id: 'done', label: 'Pronto' },
        ]);
        if (id === 'done') break;
        picks.push(id);
        left -= mightOf(c, g.objs[id]);
      }
      // por execução: com Repeat (Temporal Portal) cada uma faz as próprias escolhas (820.2.a)
      c.data[`bf${c.rep}`] = bf;
      c.data[`picks${c.rep}`] = picks;
      return true;
    },
    targets: (c) =>
      ((c.data[`picks${c.rep}`] as string[]) || []).map((id) => ({
        prompt: 'Fox-Fire: alvo',
        // cada alvo continua precisando estar naquele campo
        filter: (cc: Ctx, o: Obj) => o.id === id && cc.g.bfIndex(o) === cc.data[`bf${cc.rep}`],
      })),
    resolve: function* (c) {
      const g = c.g;
      let group = c.targets.flat().filter((u) => u.zone === 'board');
      const total = (us: Obj[]) => us.reduce((s, u) => s + mightOf(c, u), 0);
      if (total(group) > LIMIT) {
        // regra 355.11.b: escolher um subconjunto dos alvos que ainda some 4 ou menos
        const keep: Obj[] = [];
        let left = LIMIT;
        for (let guard = 0; guard < 50; guard++) {
          const cands = group.filter((u) => !keep.includes(u) && mightOf(c, u) <= left);
          if (!cands.length) break;
          const [id] = yield* g.ask(
            c.p,
            'choose',
            `Fox-Fire: o Might total passou de ${LIMIT}. Quais alvos matar? (Might restante: ${left})`,
            [...cands.map((u) => ({ id: u.id, label: g.describe(u), obj: u.id })), { id: 'done', label: 'Pronto' }],
          );
          if (id === 'done') break;
          const u = g.objs[id];
          keep.push(u);
          left -= mightOf(c, u);
        }
        group = keep;
      }
      if (group.length) yield* g.killG(group); // uma ação só: mortes simultâneas
    },
  },
});
