import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// [Reaction]. Escolha uma unidade aliada num campo de batalha. Anule um spell ou habilidade inimigo que escolhe ela e
// nenhuma outra unidade aliada.
// - Dois alvos obrigatórios: a unidade aliada num campo e o item inimigo na pilha (355.9.a.2); sem um item que se
//   encaixe, Repulse não pode ser jogada (RiftJudge #12384).
// - "Escolhe": as escolhas de alvo do item (todas as execuções, inclusive Repeat). A relação de alvo continua enquanto
//   o objeto escolhido fica no tabuleiro, mesmo que ele deixe de cumprir a restrição do item; só some se ele saiu do
//   tabuleiro (virou outro objeto). Repulse conta essas "setas" que apontam para unidades aliadas (FAQ oficial do
//   Unleashed: Alpha Strike, Flash e Repulse).
/** Unidades aliadas (de c.p) que o item da pilha `o` escolheu e que ainda são o mesmo objeto no tabuleiro. */
function friendlyChosen(c: Ctx, o: Obj): Set<string> | undefined {
  const g = c.g;
  const it = g.chainItemOf(o);
  if (!it) return undefined;
  const groups: { ids: string[][]; vers: number[][] }[] = [{ ids: it.targetIds, vers: it.targetVers }];
  if (it.repeatIds) groups.push({ ids: it.repeatIds, vers: it.repeatVers || [] });
  for (const x of it.moreRepeats || []) groups.push(x);
  const out = new Set<string>();
  for (const { ids, vers } of groups)
    ids.forEach((grp, si) =>
      grp.forEach((id, k) => {
        const t = g.objs[id];
        if (t && t.zone === 'board' && t.zoneVersion === vers[si]?.[k] && g.isUnit(t) && t.controller === c.p) out.add(id);
      }),
    );
  return out;
}

registerCard({
  code: 'UNL-106',
  keywords: { reaction: true },
  spell: {
    label: 'Repulse',
    targets: [
      { prompt: 'Repulse: qual unidade sua num campo de batalha?', filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) >= 0 },
      {
        prompt: 'Repulse: anular qual spell ou habilidade inimiga (que escolhe só essa unidade sua)?',
        kind: 'chainItem',
        filter: (c, o) => {
          const u = c.targets[0]?.[0];
          const it = c.g.chainItemOf(o);
          if (!u || !it || it.controller === c.p) return false;
          const ch = friendlyChosen(c, o);
          return !!ch && ch.size === 1 && ch.has(u.id);
        },
      },
    ],
    resolve: function* (c) {
      const u = c.targets[0][0];
      const s = c.targets[1]?.[0];
      if (!u || !s) return; // a unidade deixou de ser alvo válido: "ela" é nula e a anulação é ignorada (359.3.f.2.a)
      const ch = friendlyChosen(c, s);
      const item = c.g.chainItemOf(s);
      if (item && ch && ch.size === 1 && ch.has(u.id)) c.g.counter(item);
    },
  },
});
