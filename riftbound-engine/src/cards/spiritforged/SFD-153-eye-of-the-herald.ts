import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Order]. Texto de efeito (acrescentado à unidade equipada, regra 136.2.c): "Quando eu me movo, jogue uma ficha
// Recruit de 1 de Might aqui."
// - "Eu" é a unidade equipada; o gatilho é dela, controlado por quem a controla (RiftJudge #8952, #10559).
// - "Aqui" é o local da unidade quando o gatilho resolve, inclusive a base (FAQ #11375); se ela saiu do tabuleiro antes,
//   não há ficha (FAQ #9629, #11431). Se o Eye trocar de unidade depois do movimento, quem gerou o gatilho continua sendo
//   a unidade que se moveu (FAQ #416). Dois Eye na mesma unidade: dois gatilhos (FAQ #12440).
registerCard({
  code: 'SFD-153',
  equipCost: E(0, 'Order'),
  equipped: {
    triggers: [
      {
        on: 'move',
        label: 'Ficha Recruit aqui',
        cond: (c, ev) => {
          if (ev.unit?.id !== c.self.id) return false;
          ev.unitVer = c.self.zoneVersion; // a mesma unidade (não uma que saiu e voltou)
          return true;
        },
        resolve: function* (c) {
          const u = c.self;
          if (u.zone !== 'board' || u.zoneVersion !== c.ev!.unitVer || !u.loc) return;
          yield* c.g.playTokenG('TOK-RECRUIT', c.p, u.loc);
        },
      },
    ],
  },
});
