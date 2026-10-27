import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';

// [Shield 5]. [Tank]. Custo [2][Calm] a menos para cada ponto que você ganhou segurando (hold) campos neste turno.
// Ponto não ganho (Tianna Crownguard) não conta.
const held = (g: Engine, p: P) => g.pl[p].holdPoints || 0; // zerado a cada turno pelo motor
registerCard({
  code: 'SFD-055',
  keywords: { shield: 5, tank: true },
  selfCostMod: (g, self, p) => -2 * held(g, p),
  selfPowerCut: (g, self, p) => ({ domain: 'Calm', n: held(g, p) }),
});
