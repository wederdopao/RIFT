import { registerCard } from '../../engine/script';
// Lenda: quando você vence um combate, compre 1. Vence quem é o único jogador com unidades no campo depois do
// combate, atacando ou defendendo, mesmo sem dano de combate (regra 466.3.a; FAQ oficial do Spiritforged, Draven,
// Audacious). O gatilho resolve antes de estabelecer controle e da conquista (regra 466.4).
registerCard({
  code: 'SFD-185',
  triggers: [
    {
      on: 'combatWin',
      label: 'Venceu um combate: comprar 1',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
