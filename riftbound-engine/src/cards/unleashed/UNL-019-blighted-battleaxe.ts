import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Blighted Battleaxe (Equipment, +4 de Might impresso). Equip [1][Fury] (o cards.json perdeu o ícone e diz [Rune]; a arte,
// assets/art/UNL-019.webp, e o texto em outros idiomas trazem [Fury] — revisão UNL fury).
// Texto de efeito (da unidade equipada): no fim do seu turno, se eu não conquistei neste turno, desanexe isto e cause 4
// de dano a mim.
// - "Eu" é a unidade equipada e tem de ter conquistado ela mesma (a conquista de outra unidade sua não conta; RiftJudge
//   #9662); conta a conquista em qualquer momento do turno, mesmo antes de o machado ser anexado (Engine.unitConqueredThisTurn).
// - "Seu turno" é o turno de quem controla a unidade. O "se eu não conquistei" vem logo depois da condição: faz parte
//   dela e só é conferido ao disparar (383.2.a.1, exemplo da Sona).
// - O dano é causado no fim do turno e curado na expiração do mesmo turno (RiftJudge #11352): só mata se for letal.
// - Se o machado já não estiver anexado na resolução, desanexar não faz nada, mas os 4 de dano ainda são causados.
registerCard({
  code: 'UNL-019',
  equipCost: E(1, 'Fury'),
  equipped: {
    triggers: [
      {
        on: 'turnEnd',
        label: 'Não conquistei: desanexar o machado e 4 de dano em mim',
        cond: (c, ev) => ev.player === c.p && !c.g.unitConqueredThisTurn(c.self),
        resolve: function* (c) {
          const g = c.g;
          if (c.gear && c.gear.attachedTo === c.self.id) g.detach(c.gear, c.p);
          if (c.self.zone === 'board') g.dealDamage(c.self, 4, c.self);
        },
      },
    ],
  },
});
