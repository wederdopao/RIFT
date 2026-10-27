import { registerCard } from '../../engine/script';
// VEN-166 Threshold of the Gray — "When combat starts here, the attacker and defender each [add] [1]." Gatilho que adiciona
// recursos: resolve assim que é finalizado, sem ficar na pilha (429.2).
registerCard({
  code: 'VEN-166',
  triggers: [
    {
      on: 'combatStart',
      label: 'Atacante e defensor adicionam [1]',
      immediate: true,
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self),
      resolve: function* (c) {
        const ev = c.ev!;
        for (const p of [ev.attacker, ev.defender]) if (p === 0 || p === 1) c.g.addResources(p, 1, []);
      },
    },
  ],
});
