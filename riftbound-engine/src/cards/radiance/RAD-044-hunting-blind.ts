import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Deploy. Ao jogar, pode mover uma unidade inimiga para este campo. Unidades aliadas aqui têm Shield 2.
registerCard({
  code: 'RAD-044',
  keywords: { deploy: true },
  onPlay: [
    {
      label: 'Mover uma unidade inimiga para este campo',
      optional: 'Mover uma unidade inimiga para este campo?',
      targets: [T.enemyUnit('Hunting Blind: mover qual unidade inimiga para este campo?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const i = c.g.bfIndex(c.self);
        if (u && u.zone === 'board' && i >= 0) c.g.moveUnits([u], { t: 'bf', i }, c.p);
      },
    },
  ],
  auras: [
    {
      keywords: (g, src, t) => {
        const i = g.bfIndex(src);
        return src.zone === 'board' && i >= 0 && t.controller === src.controller && g.isUnit(t) && g.bfIndex(t) === i ? { shield: 2 } : undefined;
      },
    },
  ],
});
