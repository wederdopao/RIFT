import { registerCard } from '../../engine/script';

// Campeão 4, Ambush. Quando eu ataco ou defendo, se uma unidade inimiga estiver sozinha aqui, eu ganho +2 de Might neste
// turno e você ganha 2 XP.
// - O "se" logo depois da condição faz parte da condição do gatilho (383.2.a.1): é conferido quando eu ganho a designação
//   de atacante/defensor (383.4.e.2.b, 383.4.f.2.b); se mudar depois, o gatilho resolve mesmo assim.
// - Sozinha = sem outras unidades aliadas dela no mesmo local (740.2.a): no 1x1, exatamente uma unidade inimiga aqui.
registerCard({
  code: 'UNL-143',
  keywords: { ambush: true },
  triggers: [
    {
      on: ['attack', 'defend'],
      label: '+2 de Might neste turno e ganhar 2 XP',
      cond: (c, ev) => {
        if (ev.unit?.id !== c.self.id) return false;
        const g = c.g;
        const i = g.bfIndex(c.self);
        return i >= 0 && g.unitsAtBf(i).some((u) => u.controller !== c.p && g.isAlone(u));
      },
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 2);
        c.g.gainXp(c.p, 2);
      },
    },
  ],
});
