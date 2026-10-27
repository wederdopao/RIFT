import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Gear. Descarte 1, [Tap]: escolha uma unidade aliada. Da próxima vez que ela fosse morrer neste turno, você pode
// pagar [Fury] para curá-la, exauri-la e chamá-la de volta para a base (recall) no lugar.
registerCard({
  code: 'OGN-023',
  activated: [
    {
      label: 'Descartar 1, exaurir: proteger uma unidade sua da morte',
      exhaustSelf: true,
      canPayExtra: (c) => c.g.pl[c.p].hand.length > 0,
      extraCost: function* (c) {
        if (!c.g.pl[c.p].hand.length) return false;
        const d = yield* c.g.discard(c.p, 1, 'Unlicensed Armory: descarte 1');
        return d.length > 0;
      },
      targets: [{ prompt: 'Unlicensed Armory: proteger qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || u.zone !== 'board') return;
        // substituição opcional: o motor pergunta na hora da morte se quer pagar [Fury] (regra 371.2.a)
        c.g.addEffect({ target: u.id, player: c.p, flag: 'retreat', retreatCost: E(0, 'Fury'), retreatOptional: true, until: 'turn' });
        c.g.say(`Se ${c.g.name(u)} fosse morrer neste turno, ${c.g.pname(c.p)} pode pagar [Fury] para ela voltar à base.`, c.p);
      },
    },
  ],
});
