import { registerCard } from '../../engine/script';

// Hidden, Action: dê Buff a uma unidade aliada. Buffs dão +1 de Might extra às unidades aliadas neste turno.
registerCard({
  code: 'OGN-053',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Stand United',
    alwaysResolve: true, // o bônus dos Buffs vale mesmo com o alvo ilegal (regra 359.3.e.5)
    targets: [{ prompt: 'Stand United: Buff em qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.buff(u, c.p);
      c.g.addEffect({ player: c.p, buffBonus: 1, until: 'turn' });
      c.g.say(`Neste turno, os Buffs de ${c.g.pname(c.p)} valem +2.`, c.p);
    },
  },
});
