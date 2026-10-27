import { registerCard } from '../../engine/script';
import type { TargetSpec } from '../../engine/script';
// Seis vezes: cause 2 de dano a uma unidade (errata de 14/01/2026: seis instruções separadas).
// Os seis alvos são escolhidos ao jogar e podem repetir a mesma unidade; o Deflect é pago a cada vez que a unidade é
// escolhida (regra 809.1.c; ruling FAQ #2416 em app.riftjudge.com). Os seis danos acontecem na resolução.
const specs: TargetSpec[] = Array.from({ length: 6 }, (_, k) => ({ prompt: `Icathian Rain: 2 de dano em qual unidade? (${k + 1}/6)` }));
registerCard({
  code: 'OGN-248',
  spell: {
    label: 'Icathian Rain',
    targets: specs,
    resolve: function* (c) {
      for (const grp of c.targets) {
        const u = grp[0];
        if (u && u.zone === 'board') c.g.dealDamage(u, 2, c.self);
      }
    },
  },
});
