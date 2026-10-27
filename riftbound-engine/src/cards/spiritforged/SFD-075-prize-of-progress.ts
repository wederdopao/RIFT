import { registerCard } from '../../engine/script';

// Quando você usa uma habilidade ativada de um gear, dê-me +1 de Might neste turno.
// - "Usar" dispara quando a habilidade resolve (regra 377.2.a): pela pilha, o evento 'abilityUsed' (habilidade anulada
//   não conta); as de [Add] (Gold, Hextech Anomaly...) resolvem na hora, e para elas 'activate' (isAdd) é a resolução.
// - Equip é uma habilidade ativada do gear (818.1.c.2). Cada Gold usado para pagar é um uso (FAQ riftjudge #11964).
// - Weaponmaster e Quick-Draw não usam o Equip (só anexam).
registerCard({
  code: 'SFD-075',
  triggers: [
    {
      on: ['abilityUsed', 'activate'],
      label: '+1 de Might neste turno',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && c.g.isGear(ev.obj) && (ev.type === 'abilityUsed' || !!ev.isAdd),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 1);
      },
    },
  ],
});
