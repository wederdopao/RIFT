import { registerCard, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Reaction. Escolha uma unidade e um Equipment com o mesmo controlador. Equipe esse Equipment nessa unidade ou
// desequipe esse Equipment dessa unidade. Compre 1.
// - Unidade e Equipment são alvos (355.7), com o requisito de grupo "mesmo controlador" (355.11).
// - Equipar ou desequipar não é uma lista de modos: é escolhido na resolução (355.17).
// - Desequipar: o Equipment fica no local da unidade e, se for um campo, a limpeza o chama de volta (435.4, 435.4.a).
// - "Compre 1" vale mesmo com os alvos ilegais (359.3.e.5; RiftJudge FAQ #4742).
const isEquipment = (c: Ctx, o: Obj) => c.g.isEquipment(o);
/** Unidade escolhida (na resolução, a da pilha). */
const chosenUnit = (c: Ctx): Obj | undefined => {
  const id = c.item ? c.item.targetIds[0]?.[0] : c.targets[0]?.[0]?.id;
  return id ? c.g.objs[id] : undefined;
};
registerCard({
  code: 'SFD-011',
  keywords: { reaction: true },
  spell: {
    label: 'Angle Shot',
    alwaysResolve: true,
    targets: [
      {
        prompt: 'Angle Shot: escolha uma unidade',
        filter: (c, o) => c.g.board().some((e) => isEquipment(c, e) && e.controller === o.controller),
      },
      {
        prompt: 'Angle Shot: escolha um Equipment com o mesmo controlador',
        kind: 'gear',
        filter: (c, o) => isEquipment(c, o) && o.controller === chosenUnit(c)?.controller,
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const e = c.targets[1]?.[0];
      if (u && e && u.zone === 'board' && e.zone === 'board' && u.controller === e.controller) {
        const on = e.attachedTo === u.id;
        const [k] = yield* g.ask(c.p, 'choose', `Angle Shot: ${g.name(e)} e ${g.name(u)}`, [
          { id: 'attach', label: `Equipar ${g.name(e)} em ${g.name(u)}${on ? ' (já está equipado: nada acontece)' : ''}`, obj: u.id },
          { id: 'detach', label: `Desequipar ${g.name(e)} de ${g.name(u)}${on ? '' : ' (não está equipado nela: nada acontece)'}`, obj: e.id },
        ]);
        if (k === 'attach') {
          if (!on) g.attach(e, u, c.p);
        } else if (on) g.detach(e, c.p); // fica no local da unidade (435.4); solto num campo, a limpeza o chama de volta (435.4.a)
      }
      yield* g.draw(c.p, 1);
    },
  },
});
