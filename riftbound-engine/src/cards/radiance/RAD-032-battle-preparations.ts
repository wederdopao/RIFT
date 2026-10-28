import { registerCard } from '../../engine/script';
import type { TargetSpec } from '../../engine/script';
import { T, showOff, showedOff } from '../helpers';

// Reaction. Show Off um gear. Dê +2 de Might a uma unidade neste turno. Se fez Show Off, prepare até 2 runas.
// - As runas estão no tabuleiro (zona pública): são alvos, escolhidos ao jogar, de 0 a 2 (355.10, 355.13; como
//   Gentle Gemdragon): o jogador escolhe quais. O texto diz "runas", sem restringir de quem; uma runa ainda pronta pode
//   ser escolhida (ex.: as que vão pagar este spell); preparar algo pronto não faz nada (415.1.c).
// - O Show Off é feito enquanto o spell é jogado, antes dos alvos: sem Show Off não há runas a escolher.
const UNIT = T.anyUnit('Battle Preparations: +2 de Might em qual unidade?');
const RUNES: TargetSpec = { prompt: 'Battle Preparations: preparar quais runas? (até 2)', kind: 'rune', min: 0, max: 2 };

registerCard({
  code: 'RAD-032',
  keywords: { reaction: true },
  asPlayed: showOff((g, o) => g.isGear(o), 'Show Off um gear'),
  spell: {
    label: 'Battle Preparations',
    targets: (c) => (showedOff(c) ? [UNIT, RUNES] : [UNIT]),
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (u) g.giveMight(u, 2);
      if (!showedOff(c)) return;
      let n = 0;
      for (const r of c.targets[1] || [])
        if (r.exhausted) {
          g.ready(r, c.p);
          n++;
        }
      if (n) g.say(`${g.pname(c.p)} prepara ${n} runa(s).`, c.p);
    },
  },
});
