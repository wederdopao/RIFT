import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-155 Kennen, Heart of the Tempest
registerCard({
  code: 'VEN-155',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Empower em mim',
      cond: (c, ev) => ev.player === c.p && !!ev.via && ev.via !== 'hand' && !c.self.empowered,
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
