import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-126',
  keywords: { reaction: true },
  spell: {
    label: 'Ki Barrier',
    targets: [T.anyUnit('Ki Barrier: prevenir 7 de dano em qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      u.prevent += 7;
      c.g.say(`Os próximos 7 de dano em ${c.g.name(u)} são prevenidos neste turno.`);
    },
  },
});
