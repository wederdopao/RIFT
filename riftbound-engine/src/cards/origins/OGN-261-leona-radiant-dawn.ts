import { registerCard } from '../../engine/script';
// Lenda: quando você atordoa uma ou mais unidades inimigas, dê Buff a uma unidade aliada.
const LABEL = 'Buff numa unidade aliada';
registerCard({
  code: 'OGN-261',
  triggers: [
    {
      on: 'stun',
      label: LABEL,
      // "uma ou mais": as unidades atordoadas pela mesma instrução (mesmo `batch`) disparam uma vez só;
      // instruções diferentes são eventos diferentes
      cond: (c, ev) =>
        ev.player === c.p && !!ev.unit && ev.unit.controller !== c.p &&
        !c.g.pending.some((x: any) => x.sourceId === c.self.id && x.label === LABEL && x.ev?.batch === ev.batch),
      targets: [{ prompt: 'Leona: Buff em qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
