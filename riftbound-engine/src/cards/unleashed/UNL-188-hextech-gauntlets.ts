import { registerCard } from '../../engine/script';
import { DOMAINS } from '../../engine/types';
// Signature Gear (Vi), Equipamento, +3 de Might (bônus impresso). [Equip] [3][A]: o custo de energia desta habilidade é
// reduzido pelo Might da unidade escolhida.
// - O custo depende da unidade escolhida (equipFor): energia 3 menos o Might atual dela, nunca abaixo de 0; Might negativo
//   não aumenta o custo (477.3.c). O [A] (power de qualquer domínio) continua. O Weaponmaster usa este mesmo custo.
// Texto de efeito: quando eu conquisto, se você atribuiu 3 ou mais de dano excedente, compre 1 ("eu" = a unidade equipada,
// que precisa estar no campo na conquista; FAQ riftjudge #9486).
registerCard({
  code: 'UNL-188',
  equipFor: (g, _gear, unit) => ({ energy: Math.max(0, 3 - Math.max(0, g.might(unit))), power: [[...DOMAINS]] }),
  equipped: {
    triggers: [
      {
        on: 'conquer',
        label: 'Comprar 1 (dano excedente)',
        cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id) && (ev.excess || 0) >= 3,
        resolve: function* (c) {
          yield* c.g.draw(c.p, 1);
        },
      },
    ],
  },
});
