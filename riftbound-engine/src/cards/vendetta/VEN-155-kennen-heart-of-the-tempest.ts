import { registerCard } from '../../engine/script';
import { disempowerMe } from '../vendetta/leg-helpers';
// VEN-155 Kennen, Heart of the Tempest — "When you play a card from anywhere other than your hand, empower me." Olha a zona
// de onde a carta saiu (evento cardPlayed.from): descarte (Flow, Endless Riches), escondida, zona de campeão, banidas...;
// uma carta jogada por efeito a partir da mão não conta. O gatilho vai para a pilha mesmo com o Kennen já Empowered (o
// estado dele não faz parte da condição; 441.1.c: nada acontece a mais).
registerCard({
  code: 'VEN-155',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Empower em mim',
      cond: (c, ev) => ev.player === c.p && !!ev.from && ev.from !== 'hand',
      resolve: function* (c) {
        c.g.empowerObj(c.self, c.p);
      },
    },
  ],
  activated: [
    {
      label: 'Disempower em mim, exaurir: dar [Assault 2] a uma unidade neste turno',
      timing: 'action',
      exhaustSelf: true,
      condition: (_g, self) => self.empowered,
      extraCost: disempowerMe,
      targets: [{ prompt: 'Kennen: dar Assault 2 a qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveKw(u, { assault: 2 }, 'turn');
      },
    },
  ],
});
