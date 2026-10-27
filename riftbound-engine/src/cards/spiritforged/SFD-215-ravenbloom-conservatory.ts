import { registerCard } from '../../engine/script';
import { youHere, bfIdx } from '../helpers';
// Campo: quando você defende aqui, revele a carta do topo do seu deck. Se for um spell, ponha-a na sua mão. Senão,
// recicle-a. "Você" é quem controla o campo (regra 190.6.d). Deck vazio: nada a revelar, sem Burn Out (431.1.c).
registerCard({
  code: 'SFD-215',
  triggers: [
    {
      on: 'defend',
      label: 'Revelar o topo do deck: spell vai para a mão, senão recicla',
      cond: (c, ev) => !!ev.playerLevel && ev.bf === bfIdx(c) && youHere(c, ev.player),
      resolve: function* (c) {
        const g = c.g;
        const [o] = yield* g.revealTop(c.p, 1); // inclui substituições de revelar (Void Hatchling) e onReveal
        if (!o) return;
        if (g.kind(o) === 'spell') {
          g.toZone(o, 'hand');
          g.say(`${g.name(o)} vai para a mão de ${g.pname(c.p)}.`, c.p);
        } else g.recycleCard(o, { by: c.p });
      },
    },
  ],
});
