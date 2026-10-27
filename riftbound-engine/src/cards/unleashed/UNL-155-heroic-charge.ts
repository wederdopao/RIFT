import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// [Action]. Dê +1 de Might neste turno a uma unidade aliada e atordoe ([Stun]) uma unidade inimiga no local dela.
// - As duas unidades são alvos escolhidos ao jogar; é preciso ter escolhas válidas para todos (355.8): só aparece como
//   opção a aliada que tem uma inimiga no mesmo local.
// - "No local dela" é verificado na resolução (referentes; 359.3.e.12): se a aliada saiu do tabuleiro, a inimiga deixa
//   de ser alvo válido; se a inimiga saiu daquele local, só o +1 acontece (359.3.e.5).
const sameLoc = (c: Ctx, a: Obj | undefined, b: Obj) => !!a && a.zone === 'board' && c.g.locEq(c.g.locOf(a), c.g.locOf(b));
const enemyAt = (c: Ctx, f: Obj) => c.g.units().some((e) => e.controller !== c.p && sameLoc(c, f, e));
registerCard({
  code: 'UNL-155',
  keywords: { action: true },
  spell: {
    label: 'Heroic Charge',
    targets: [
      {
        prompt: 'Heroic Charge: +1 de Might em qual unidade sua?',
        cands: (c) => c.g.units().filter((u) => u.controller === c.p && enemyAt(c, u)),
        filter: (c, o) => o.controller === c.p,
      },
      {
        prompt: 'Heroic Charge: atordoar qual unidade inimiga no local dela?',
        filter: (c, o) => o.controller !== c.p && sameLoc(c, c.targets[0]?.[0], o),
      },
    ],
    resolve: function* (c) {
      const f = c.targets[0][0];
      const e = c.targets[1]?.[0];
      if (f) c.g.giveMight(f, 1);
      if (e) c.g.stun(e, c.p);
    },
  },
});
