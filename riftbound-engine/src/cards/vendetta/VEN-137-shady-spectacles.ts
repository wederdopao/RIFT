import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Obj } from '../../engine/types';

// VEN-137 Shady Spectacles
// "As this is attached to a unit, choose another friendly unit. The equipped unit becomes a copy of that unit for as long
// as this is attached to it." — escolha feita ao anexar (725.1; resolve na hora, sem pilha) e g.becomeCopy(..., gear):
// a cópia acaba quando o gear se solta (desanexar, anexar a outra unidade ou sair do tabuleiro).
registerCard({
  code: 'VEN-137',
  equipCost: E(1, 'Order'),
  triggers: [
    {
      on: 'attach',
      immediate: true,
      label: 'Shady Spectacles: a unidade equipada vira cópia de outra unidade aliada',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.unit,
      resolve: function* (c) {
        const g = c.g;
        const host = c.ev!.unit as Obj;
        if (host.zone !== 'board' || c.self.attachedTo !== host.id) return;
        const cands = g.units().filter((u) => u.controller === host.controller && u.id !== host.id);
        if (!cands.length) return;
        const [pick] = yield* g.chooseObj(c.p, 'Shady Spectacles: copiar qual outra unidade aliada?', cands);
        if (pick) g.becomeCopy(host, pick, c.self);
      },
    },
  ],
});
