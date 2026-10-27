import { registerCard } from '../../engine/script';

// [Ambush]. Quando eu venço um combate, compre 1.
// Vencer: o meu controlador é o único com unidades no campo na determinação do resultado e eu estou lá (466.3.a,
// 466.3.c) — evento 'combatWin'. Chamada de volta para a base não vence (RiftJudge #10708); jogada no mesmo combate
// depois que o defensor ficou sem unidades, vence (#12880).
registerCard({
  code: 'UNL-114',
  keywords: { ambush: true },
  triggers: [
    {
      on: 'combatWin',
      label: 'Comprar 1 (venci o combate)',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
