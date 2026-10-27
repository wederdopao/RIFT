import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';
// VEN-161 Piltovan Forge — "While you control this battlefield, the first friendly gear activated ability played each
// turn costs [1] less." "You" = o controlador do campo (190.6.d). Conta a primeira habilidade ativada de gear (inclusive
// Equip, [Add] e Gold) que o jogador usa no turno (Engine.activationsThisTurn), com ou sem o campo.
const applies = (g: Engine, src: Obj, holder: Obj, p: P) => {
  const i = g.bfOf(src);
  return i >= 0 && g.bfs[i].controller === p && g.isGear(holder) && holder.controller === p && g.activationsThisTurn(p, 'gearAbility') === 0;
};
registerCard({
  code: 'VEN-161',
  auras: [
    {
      abilityCostMod: (g, src, holder, _a, p) => (applies(g, src, holder, p) ? { energyLess: 1 } : undefined),
      equipCostMod: (g, src, gear, _unit, p) => (applies(g, src, gear, p) ? -1 : 0),
    },
  ],
});
