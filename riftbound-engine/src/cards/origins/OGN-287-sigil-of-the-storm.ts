import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você conquista aqui, você precisa reciclar uma das suas runas (não é escolha de alvo).
// Regra 355.10.f (o exemplo é este texto): a runa é escolhida na resolução, entre as suas.
registerCard({
  code: 'OGN-287',
  triggers: [
    {
      on: 'conquer',
      label: 'Reciclar uma das suas runas',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const runes = g.runesOf(c.p);
        if (!runes.length) return;
        const [r] = yield* g.chooseObj(c.p, 'Sigil of the Storm: qual runa sua vai ser reciclada?', runes);
        if (!r) return;
        g.recycleCard(r);
        g.say(`${g.pname(c.p)} recicla ${g.name(r)}.`, c.p);
      },
    },
  ],
});
