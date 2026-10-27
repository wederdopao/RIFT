import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// [Action]. Dê +3 [Might] a uma unidade aliada neste turno. Quando ela vencer um combate neste turno, ganhe 2 XP.
// - "Quando ela vencer..." é um gatilho atrasado criado na resolução (359.3.f.3.a), ligado à unidade escolhida: se o alvo
//   ficou inválido, a instrução ligada também é ignorada (359.3.e.14.a). Dispara a cada combate que ela vencer no turno
//   (não diz "da próxima vez").
// - Vencer: o controlador dela é o único com unidades no campo na determinação do resultado e ela está lá (466.3.a,
//   466.3.c) — evento 'combatWin' (RiftJudge #10708: unidade chamada de volta não "fica" e não vence).
// - Guarda o id e a versão de zona (a unidade que saiu do tabuleiro e voltou é outro objeto, 124).
registerCard({
  code: 'UNL-095',
  keywords: { action: true },
  spell: {
    label: 'Grim Resolve',
    targets: [{ prompt: 'Grim Resolve: +3 de Might em qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      g.giveMight(u, 3);
      const id = u.id;
      const ver = u.zoneVersion;
      const p = c.p as P;
      g.addDelayed({
        controller: p,
        sourceId: c.self.id,
        on: 'combatWin',
        once: false,
        untilTurn: g.turn,
        cond: (cc, ev) => (ev.units || []).includes(id) && cc.g.objs[id]?.zoneVersion === ver,
        ability: {
          label: 'Grim Resolve: ganhar 2 XP (a unidade venceu o combate)',
          resolve: function* (cc) {
            cc.g.gainXp(p, 2, cc.self);
          },
        },
      });
    },
  },
});
