import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// [Vision]. Se você gastou [4] ou mais para jogar um spell neste turno, você pode me jogar por [C] (power de Mente).
// - Custo alternativo (CardScript.altCost): troca o custo base; Accelerate não há, descontos valem.
// - "Gastou [4] para jogar um spell": energia paga por UM spell, com custos adicionais como Repeat (RiftJudge #10012);
//   spells diferentes não somam (#10307); conta mesmo se o spell for anulado (FAQ oficial do Unleashed, 29/04/2026; #9920);
//   jogar de Hidden custa 0 e não conta (#10399). O motor marca isso ao pagar (Engine.noteSpellSpend).
registerCard({
  code: 'UNL-089',
  keywords: { vision: 1 },
  altCost: (g, _self, p) => (g.pl[p].bigSpell === g.turn ? E(0, 'Mind') : undefined),
});
