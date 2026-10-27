import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj } from '../../engine/types';

// Accelerate. Se você gastou pelo menos [A][A] neste turno, tenho +2 de Might e Ganking.
// Gastar = pagar custos com power (cartas, habilidades, Deflect, esconder...); só gerar power (Gold, runas) não conta,
// e vale mesmo que a carta paga seja anulada depois (FAQ riftjudge #12921).
const active = (g: Engine, self: Obj) => self.zone === 'board' && g.powerSpentThisTurn(self.controller) >= 2;
registerCard({
  code: 'SFD-143',
  keywords: { accelerate: true },
  mightMod: (g, self) => (active(g, self) ? 2 : 0),
  kwMod: (g, self) => (active(g, self) ? { ganking: true } : undefined),
});
