import { registerCard } from '../../engine/script';

// VEN-099 Tornado Warrior: "[Hidden]. When you play me from face down, you may empower something here. Disempower it at
// end of turn."
// "something here" é alvo (355.10) sem outra restrição: pode ser algo já Empowered (empower não muda nada, 827) e o
// "Disempower it at end of turn" vale do mesmo jeito (leitura literal; sem ruling).
registerCard({
  code: 'VEN-099',
  keywords: { hidden: true },
  triggers: [
    {
      on: 'play',
      label: 'Tornado Warrior: empower algo aqui até o fim do turno',
      optional: 'Tornado Warrior: empower algo aqui?',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.via === 'hidden',
      targets: [
        {
          prompt: 'Tornado Warrior: empower o quê (aqui)?',
          kind: 'permanent',
          filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const t = c.targets[0][0];
        if (!t || t.zone !== 'board') return;
        c.g.empowerObj(t, c.p);
        const tid = t.id;
        const ver = t.zoneVersion;
        c.g.addDelayed({
          controller: c.p,
          sourceId: c.self.id,
          on: 'turnEnd',
          once: true,
          untilTurn: c.g.turn,
          ability: {
            label: 'Tornado Warrior: desempower',
            resolve: function* (cc) {
              const o = cc.g.objs[tid];
              if (o && o.zone === 'board' && o.zoneVersion === ver) cc.g.disempower(o);
            },
          },
        });
      },
    },
  ],
});
