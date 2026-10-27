import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// [Reaction]. Anule (Counter) um spell ou habilidade inimigo que escolhe uma unidade ou gear aliado.
// Leitura: [spell ou habilidade inimigos] que escolhem [unidade ou gear aliados] (RiftJudge FAQ #62). "Escolher" =
// ter como alvo (regra 355.7); anula o item inteiro, mesmo com outros alvos (FAQ #10330). Habilidades na pilha são
// alvos válidos (regra 355.9.a.2): kind 'chainItem'.
const ok = (c: Ctx, o: Obj) => {
  const g = c.g;
  const it = g.chainItemOf(o);
  if (!it || it.controller === c.p) return false;
  // escolhas de todas as execuções: a normal e as de cada instância de Repeat paga (820.2.a, 820.3)
  const ids = [...it.targetIds.flat(), ...(it.repeatIds || []).flat(), ...(it.moreRepeats || []).flatMap((x) => x.ids.flat())];
  return ids.some((id) => {
    const t = g.objs[id];
    return !!t && t.zone === 'board' && t.controller === c.p && (g.isUnit(t) || g.isGear(t));
  });
};
registerCard({
  code: 'SFD-045',
  keywords: { reaction: true },
  spell: {
    label: 'Not So Fast',
    targets: [{ prompt: 'Not So Fast: anular qual spell ou habilidade inimiga?', kind: 'chainItem', filter: ok }],
    resolve: function* (c) {
      const s = c.targets[0][0];
      const item = s && c.g.chainItemOf(s);
      if (item) c.g.counter(item);
    },
  },
});
