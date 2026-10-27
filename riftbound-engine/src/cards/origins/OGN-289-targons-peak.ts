import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
import type { P } from '../../engine/types';
// Campo: quando você conquista aqui, prepare até 2 runas no fim deste turno.
// O "no fim deste turno" é um gatilho atrasado; as runas são alvos escolhidos quando ele vai para a pilha
// (regra 355.5.b, que usa esta carta como exemplo), de 0 a 2 (regra 355.13). O texto diz "runas", sem restringir de
// quem; preparar runa já pronta não faz nada (regra 415.1.c), então só as exauridas aparecem como opção.
// Conquista durante a fase final não gera o gatilho atrasado (regra 359.3.e.16, também com esta carta de exemplo).
registerCard({
  code: 'OGN-289',
  triggers: [
    {
      on: 'conquer',
      label: 'Preparar até 2 runas no fim do turno',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        if (g.phase === 'ending') return;
        const p = c.p as P;
        g.addDelayed({
          controller: p,
          sourceId: c.self.id,
          on: 'turnEnd',
          once: true,
          untilTurn: g.turn,
          ability: {
            label: "Targon's Peak: preparar até 2 runas",
            targets: [
              {
                prompt: "Targon's Peak: quais runas preparar? (até 2)",
                kind: 'rune',
                filter: (_cc, o) => o.exhausted,
                min: 0,
                max: 2,
              },
            ],
            resolve: function* (cc) {
              const runes = cc.targets[0] || [];
              for (const r of runes) cc.g.ready(r, p);
              if (runes.length) cc.g.say(`${cc.g.pname(p)} prepara ${runes.length} runa(s).`, p);
            },
          },
        });
      },
    },
  ],
});
