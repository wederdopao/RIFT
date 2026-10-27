import { registerCard } from '../../engine/script';
// Lenda: quando uma unidade inimiga ataca um campo que você controla, dê -1 de Might a ela neste turno
// (até um mínimo de 1).
registerCard({
  code: 'OGN-255',
  triggers: [
    {
      on: 'attack',
      label: '-1 de Might no atacante',
      cond: (c, ev) => !!ev.unit && ev.unit.controller !== c.p && c.g.bfs[ev.bf]?.controller === c.p,
      resolve: function* (c) {
        const u = c.ev!.unit;
        if (u.zone === 'board') c.g.giveMight(u, -1, 'turn', 1);
      },
    },
  ],
});
