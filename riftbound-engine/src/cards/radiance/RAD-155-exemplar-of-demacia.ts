import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe } from '../vendetta/leg-helpers';
// RAD-155 Exemplar of Demacia — "When you play a gear with [Deploy], you may exhaust me and pay [Rune] to move a friendly
// unit to that battlefield." Exaurir e pagar são o custo do gatilho (383.3.b); o movimento passa por moveUnitsG (custo
// aplicado ao movimento à escolha do jogador, 204.4).
registerCard({
  code: 'RAD-155',
  triggers: [
    {
      on: 'play',
      label: 'Exaurir e pagar [Rune]: mover uma unidade aliada para esse campo',
      optional: 'exaurir a lenda e pagar [Rune] para mover uma unidade aliada para esse campo?',
      cond: (c, ev) =>
        ev.player === c.p && !c.self.exhausted && !ev.spell && !!ev.obj && c.g.isGear(ev.obj) && !!c.g.kw(ev.obj).deploy && ev.loc?.t === 'bf',
      cost: E(0, 'any'),
      extraCost: exhaustMe,
      targets: [
        {
          prompt: 'Exemplar of Demacia: mover qual unidade aliada?',
          filter: (c, o) => o.controller === c.p && c.ev?.loc?.t === 'bf' && c.g.bfIndex(o) !== c.ev.loc.i,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const loc = c.ev?.loc;
        if (u && loc?.t === 'bf') yield* c.g.moveUnitsG([u], { t: 'bf', i: loc.i }, c.p);
      },
    },
  ],
});
