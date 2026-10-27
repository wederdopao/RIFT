import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

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
          filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self) && !o.empowered,
        },
      ],
      resolve: function* (c) {
        const t = c.targets[0][0];
        if (!t || !c.g.empowerObj(t, c.p)) return;
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
