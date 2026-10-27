import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';

// Se um oponente controla uma unidade atordoada, eu custo [2] a menos e entro pronta.
// O desconto vale ao calcular o custo (ao jogar, 356); "entro pronta" é conferido quando eu entro no tabuleiro.
const oppStunned = (g: Engine, p: P) => g.units().some((u) => u.controller !== p && u.stunned);
registerCard({
  code: 'UNL-035',
  selfCostMod: (g, self, p) => (oppStunned(g, p) ? -2 : 0),
  entersReady: (g, self) => oppStunned(g, self.controller),
});
