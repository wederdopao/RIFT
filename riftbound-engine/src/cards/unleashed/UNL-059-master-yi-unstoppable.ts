import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';

// [Level 3] Eu custo [2][Calm] a menos. [Level 6] Eu custo [4][Calm][Calm] a menos em vez disso.
// [Level 11] Eu custo [6][Calm][Calm][Calm] a menos em vez disso. [Level 16] Eu não posso ser escolhido por spells e
// habilidades inimigas.
// - Os descontos de custo valem ao jogar, conforme o XP de quem joga (824.1.c); "em vez disso": só o maior nível ativo
//   vale (não somam). Energia por selfCostMod e o power por selfPowerCut (pips de Calm).
// - Level 16: habilidade estática enquanto meu controlador tem 16+ XP (cantBeChosen).
// na mão, o Level usa a XP de quem me joga (g.levelReached com p)
const tier = (g: Engine, self: Obj, p: P) => (g.levelReached(self, 11, p) ? 3 : g.levelReached(self, 6, p) ? 2 : g.levelReached(self, 3, p) ? 1 : 0);
registerCard({
  code: 'UNL-059',
  selfCostMod: (g, self, p) => -2 * tier(g, self, p),
  selfPowerCut: (g, self, p) => {
    const n = tier(g, self, p);
    return n ? { domain: 'Calm', n } : undefined;
  },
  auras: [
    {
      cantBeChosen: (g, src, t, by) => t.id === src.id && by !== src.controller && g.levelReached(src, 16),
    },
  ],
});
