import { registerCard } from '../../engine/script';
// VEN-166 Threshold of the Gray
registerCard({
  code: 'VEN-166',
  triggers: [
    {
      on: 'combatStart',
      label: 'Atacante e defensor adicionam [1]',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self),
      resolve: function* (c) {
        const ev = c.ev!;
        for (const p of [ev.attacker, ev.defender]) if (p === 0 || p === 1) c.g.addResources(p, 1, []);
      },
    },
  ],
});
