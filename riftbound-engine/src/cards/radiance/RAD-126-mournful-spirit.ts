import { registerCard } from '../../engine/script';

// "[Deathknell] You may kill a unit or gear here." O "you may" no início do efeito é decidido ao finalizar o gatilho
// (383.3.a) e a unidade/gear é alvo, escolhido nessa hora (355.10, 355.12: Deflect e "não pode ser escolhida" valem).
// "here" = o local onde eu estava ao morrer.
registerCard({
  code: 'RAD-126',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: matar uma unidade ou gear aqui',
      optional: 'Matar uma unidade ou gear onde Mournful Spirit estava?',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.loc,
      targets: [
        {
          prompt: 'Mournful Spirit: matar qual unidade ou gear aqui?',
          kind: 'permanent',
          filter: (c, o) => o.id !== c.self.id && !!c.ev?.loc && c.g.locEq(c.g.locOf(o), c.ev.loc),
        },
      ],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (o && o.zone === 'board') yield* c.g.killG(o);
      },
    },
  ],
});
