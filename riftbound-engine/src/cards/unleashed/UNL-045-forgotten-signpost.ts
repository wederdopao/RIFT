import { registerCard, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// [Action] Exaurir uma unidade que você controla, [Tap]: mova uma unidade diferente que você controla para o local da
// unidade que você exauriu para pagar esta habilidade.
// - A unidade a mover é alvo, escolhida antes dos custos (355.5, 355.8; custos pagos depois, 356-357); a unidade
//   exaurida é custo, não alvo (355.10.c), e tem de ser outra, pronta, que você controla.
// - "O local da unidade que você exauriu" é informação referenciada, conferida na execução (359.3.f.2): se ela saiu do
//   tabuleiro, a instrução é ignorada (359.3.e.12). Mover para onde a unidade já está não faz nada (355.4.a).
const readyOthers = (c: Ctx, not?: Obj) => c.g.units().filter((u) => u.controller === c.p && !u.exhausted && u.id !== not?.id);
registerCard({
  code: 'UNL-045',
  activated: [
    {
      label: 'Exaurir uma unidade sua e este: mover outra unidade sua para o local dela',
      timing: 'action',
      exhaustSelf: true,
      targets: [
        {
          prompt: 'Forgotten Signpost: mover qual unidade sua?',
          // 355.16: só alvos que deixam o custo pagável (precisa de outra unidade sua pronta para exaurir)
          filter: (c, o) => o.controller === c.p && (!!c.item || readyOthers(c, o).length > 0),
        },
      ],
      canPayExtra: (c) => c.g.units().some((u) => u.controller === c.p && readyOthers(c, u).length > 0),
      extraCost: function* (c) {
        const g = c.g;
        const target = g.objs[c.data.targetId];
        const cands = readyOthers(c, target);
        if (!cands.length) return false;
        const [u] = yield* g.chooseObj(c.p, 'Forgotten Signpost: exaurir qual unidade sua (o destino é o local dela)?', cands);
        if (!u) return false;
        g.exhaust(u);
        c.data.paidWith = u.id;
        c.data.paidVer = u.zoneVersion;
        return true;
      },
      choose: function* (c, ids) {
        c.data.targetId = ids[0]?.[0];
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const t = c.targets[0][0];
        const paid = g.objs[c.data.paidWith];
        if (!t || !paid || paid.zone !== 'board' || paid.zoneVersion !== c.data.paidVer || !paid.loc) return;
        const to = paid.loc.t === 'base' ? { t: 'base' as const, p: t.controller } : paid.loc;
        g.moveUnits([t], to, c.p);
      },
    },
  ],
});
