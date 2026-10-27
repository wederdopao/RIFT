import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { P } from '../../engine/types';

// [1], [Tap]: um oponente adivinha um tipo de carta. Revele o topo do seu deck. Se tem esse tipo, recicle; senão, compre.
registerCard({
  code: 'RAD-064',
  activated: [
    {
      label: '[1], exaurir: oponente adivinha o tipo; revelar o topo',
      cost: E(1),
      exhaustSelf: true,
      resolve: function* (c) {
        const g = c.g;
        const q = (1 - c.p) as P;
        if (!g.pl[c.p].mainDeck.length) return;
        const [guess] = yield* g.ask(q, 'choose', 'Scrutinizing Scope: adivinhe o tipo da carta do topo', [
          { id: 'unit', label: 'Unidade' },
          { id: 'gear', label: 'Gear' },
          { id: 'spell', label: 'Spell' },
        ]);
        const [top] = yield* g.revealTop(c.p, 1, c.p);
        if (!top || top.zone !== 'mainDeck') return;
        // "If it has that type": unit gear tem os dois tipos (149.3; Patched Porobot) — isKind, não kind
        if (g.isKind(top, guess as any)) g.recycleCard(top, { by: c.p });
        else yield* g.draw(c.p, 1);
      },
    },
  ],
});
