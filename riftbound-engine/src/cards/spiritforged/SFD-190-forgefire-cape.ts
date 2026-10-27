import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Gear (Equipamento, +3 de Might — o motor soma o bônus impresso). [Unique]. [Equip] [A] (símbolo arco-íris: power de
// qualquer domínio, api.riftcodex.com).
// Efeito (texto de efeito, vale para a unidade equipada, regras 136.2.c e 718.3): "Quando eu ataco ou defendo, cause 2 a
// todas as unidades inimigas aqui." "Eu" é a unidade (c.self) e a habilidade é dela: quem a controla é o controlador da
// unidade e "inimigas" é em relação a ele. O dano é de habilidade (Bonus Damage vale) e a fonte é a unidade.
registerCard({
  code: 'SFD-190',
  keywords: { unique: true },
  equipCost: E(0, 'any'),
  equipped: {
    triggers: [
      {
        on: ['attack', 'defend'],
        label: 'Causar 2 a todas as unidades inimigas aqui',
        cond: (c, ev) => !!ev.unit && ev.unit.id === c.self.id,
        resolve: function* (c) {
          const g = c.g;
          const where = c.self.zone === 'board' ? c.self.loc : c.ev!.bf !== undefined ? { t: 'bf' as const, i: c.ev!.bf as number } : undefined;
          if (!where) return;
          for (const u of g.unitsAt(where).filter((x) => x.controller !== c.p)) g.dealDamage(u, 2, c.self);
        },
      },
    ],
  },
});
