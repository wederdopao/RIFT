import { registerCard } from '../../engine/script';

// Quando eu seguro (hold), você pode devolver uma unidade ou um gear do seu descarte para a mão.
// A carta no descarte é alvo (zona pública, regra 355.10.a); o "você pode" no início do efeito é decidido ao pôr o
// gatilho na pilha (regra 383.3.a). O gatilho de hold vale mesmo se o ponto não for ganho (regra 383.4.d.2.c).
registerCard({
  code: 'SFD-035',
  triggers: [
    {
      on: 'hold',
      label: 'Devolver unidade ou gear do descarte para a mão',
      optional: 'devolver uma unidade ou um gear do seu descarte para a mão?',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      targets: [
        {
          prompt: 'Guardian of the Passage: qual unidade ou gear do seu descarte volta para a mão?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && (c.g.isUnit(o) || c.g.isGear(o)),
        },
      ],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (o && o.zone === 'trash') {
          c.g.toZone(o, 'hand');
          c.g.say(`${c.g.name(o)} volta do descarte para a mão.`, c.p);
        }
      },
    },
  ],
});
