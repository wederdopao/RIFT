import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';

// Cada jogador escolhe 2 unidades, 2 gear, 2 runas e 2 cartas da mão. Recicle o resto.
// FAQ RiftJudge #5977: unidades, gear e runas são escolhidas entre TODAS as que estão em jogo (de qualquer jogador);
// só as cartas da mão são as do próprio jogador. Escolhe primeiro o jogador do turno, depois os outros na ordem de
// turno. O que ninguém escolheu é reciclado (ao mesmo tempo: regra 416.5).
registerCard({
  code: 'OGN-244',
  spell: {
    label: 'Divine Judgment',
    resolve: function* (c) {
      const g = c.g;
      const kept = new Set<Obj>();
      const pools: [string, () => Obj[]][] = [
        ['unidades', () => g.units()],
        ['gear', () => g.board().filter((o) => g.isGear(o))],
        ['runas', () => g.board().filter((o) => g.kind(o) === 'rune')],
      ];
      const players: P[] = [g.active, opp(g.active)];
      for (const p of players) {
        for (const [what, all] of pools) {
          const cands = all();
          const n = Math.min(2, cands.length);
          if (!n) continue;
          const ids = yield* g.ask(
            p,
            'choose',
            `Divine Judgment: escolha ${n} ${what} em jogo (de qualquer jogador) para não reciclar`,
            cands.map((o) => ({ id: o.id, label: `${g.describe(o)}${o.controller !== p ? ' — do oponente' : ''}${kept.has(o) ? ' (já escolhida)' : ''}`, obj: o.id })),
            n,
            n,
          );
          for (const id of ids) kept.add(g.objs[id]);
        }
        const hand = g.pl[p].hand.map((id) => g.objs[id]);
        const keepHand = hand.length <= 2 ? hand : yield* g.chooseObj(p, 'Divine Judgment: escolha 2 cartas da sua mão para manter', hand, 2, 2);
        for (const o of keepHand) kept.add(o);
      }
      const rest: Obj[] = [
        ...pools.flatMap(([, all]) => all()),
        ...players.flatMap((p) => g.pl[p].hand.map((id) => g.objs[id])),
      ].filter((o) => !kept.has(o));
      // tudo ao mesmo tempo: cartas no deck principal em ordem aleatória (416.5); runas na ordem do dono (416.5.a)
      yield* g.recycleCards(rest, { by: c.p });
      if (rest.length) g.say(`Divine Judgment recicla ${rest.length} carta(s).`, c.p);
    },
  },
});
