import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Gear (Equipamento, +3 de Might — o motor soma o bônus impresso). [Unique]. [Equip] [A] (power de qualquer domínio).
// Efeito (texto de efeito, vale para a unidade equipada, regra 136.2.c): "Seus spells e habilidades causam 3 de Bonus
// Damage (enquanto isto estiver preso)." "Seus" = do controlador da unidade. Bonus Damage só vale para dano de spells e
// habilidades (regra 712; dano de combate não), e várias instâncias somam (regra 714).
registerCard({
  code: 'SFD-191',
  keywords: { unique: true },
  equipCost: E(0, 'any'),
  equipped: {
    auras: [
      {
        // src = a unidade equipada
        bonusDamage: (_g, src, _t, _source, by) => (src.zone === 'board' && by === src.controller ? 3 : 0),
      },
    ],
  },
});
