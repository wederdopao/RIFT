import { registerCard } from '../../engine/script';
import { exhaustMe } from '../vendetta/leg-helpers';
// VEN-145 Nasus, Curator of the Sands
// "When you play a unit, gear or activated ability with Energy cost [7] or more, you may exhaust me to ready up to 2 runes."
// - Cartas: o custo de energia impresso. Habilidades ativadas (inclusive [Empower]): o custo do texto delas (o que o
//   próprio texto muda conta, 827.1.c.3), sem descontos de fora (evento 'activate', ev.energy). Equip: o custo impresso;
//   o texto que muda o custo de Equip só conta ao pagar (818.1.c.4, que ao contrário do 827.1.c.3 não diz "for any reason").
// - "exhaust me" é custo dentro da instrução (355.10.c.1, 383.3.b): pago ao finalizar.
// - As runas são alvos (355.10, 355.13: até 2, inclusive nenhuma), escolhidas ao finalizar; qualquer runa no tabuleiro.
registerCard({
  code: 'VEN-145',
  triggers: [
    {
      on: ['cardPlayed', 'activate'],
      label: 'Exaurir para preparar até 2 runas',
      optional: 'exaurir Nasus para preparar até 2 runas?',
      cond: (c, ev) =>
        ev.player === c.p &&
        !c.self.exhausted &&
        !!ev.obj &&
        (ev.type === 'activate' ? (ev.energy ?? 0) >= 7 : (c.g.isUnit(ev.obj) || c.g.isGear(ev.obj)) && c.g.data(ev.obj).energy >= 7),
      targets: [{ prompt: 'Nasus: preparar quais runas? (até 2)', kind: 'rune', min: 0, max: 2 }],
      extraCost: exhaustMe,
      resolve: function* (c) {
        for (const r of c.targets[0] || []) c.g.ready(r, c.p);
      },
    },
  ],
});
