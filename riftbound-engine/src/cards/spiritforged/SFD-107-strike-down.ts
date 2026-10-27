import { registerCard, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Escolha uma unidade aliada equipada. Ela causa dano igual ao próprio Might a uma unidade inimiga. Depois, solte
// (detach) um equipamento dela.
// - As duas unidades e o equipamento a soltar são alvos, escolhidos ao jogar (regras 355.5, 355.7 e 355.10: "an
//   Equipment" é um objeto citado no texto e não cai em nenhuma exceção; com um equipamento só ele continua alvo,
//   355.10.d.2). O dano é causado pela unidade, não pelo spell (regra 417.6.b.3, como Challenge).
// - Se a unidade deixou de ser alvo válido (ex.: perdeu o equipamento), nada acontece (regra 359.3.e.12, exemplo do
//   próprio Strike Down; RiftJudge FAQ #3604). Se só o equipamento escolhido deixou de estar nela, o dano acontece e
//   nenhum outro equipamento é solto (359.3.e.5).
// - Soltar: o equipamento deixa de estar preso e fica onde está (regra 435); solto num campo, a limpeza o chama de
//   volta para a base (regras 149.3 e 457.1).
/** Unidade do primeiro alvo: na resolução (contexto do item da pilha), a gravada no item; escolhendo (ao jogar ou ao
 *  refazer as escolhas com Mystic Reversal), a que acabou de ser escolhida. */
const chosenUnit = (c: Ctx): Obj | undefined => {
  const id = c.item && c === c.item.ctx ? c.item.targetIds[0]?.[0] : c.targets[0]?.[0]?.id;
  return id ? c.g.objs[id] : undefined;
};
registerCard({
  code: 'SFD-107',
  spell: {
    label: 'Strike Down',
    targets: [
      {
        prompt: 'Strike Down: qual unidade aliada equipada?',
        filter: (c, o) => o.controller === c.p && c.g.isEquipped(o),
      },
      { prompt: 'Strike Down: dano em qual unidade inimiga?', filter: (c, o) => o.controller !== c.p },
      {
        prompt: 'Strike Down: depois, soltar qual equipamento dessa unidade?',
        kind: 'gear',
        filter: (c, o) => c.g.isEquipment(o) && !!o.attachedTo && o.attachedTo === chosenUnit(c)?.id,
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const e = c.targets[1][0];
      const eq = c.targets[2]?.[0];
      if (!u) return;
      if (e) g.dealDamage(e, Math.max(0, g.might(u)), u, { byUnit: true });
      if (eq && eq.zone === 'board' && eq.attachedTo === u.id) g.detach(eq, c.p); // fica no local da unidade (435.4)
    },
  },
});
