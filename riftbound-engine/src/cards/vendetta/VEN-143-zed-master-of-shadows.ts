import { registerCard } from '../../engine/script';
import { disempowerMe } from '../vendetta/leg-helpers';
// VEN-143 Zed, Master of Shadows
// "When you banish a card you own, empower me." — só quando VOCÊ bane (ev.by; carta sua banida por spell/habilidade do
// oponente não conta) e a carta é sua. Dispara mesmo já Empowered (o lembrete "if I'm not already" é da resolução: na
// resolução, se ainda Empowered, nada acontece, 441.1.c), então responder desempoderando-o não perde o gatilho.
registerCard({
  code: 'VEN-143',
  triggers: [
    {
      on: 'banish',
      label: 'Empower em mim',
      cond: (c, ev) => ev.player === c.p && (ev.by ?? ev.player) === c.p,
      resolve: function* (c) {
        c.g.empowerObj(c.self, c.p);
      },
    },
  ],
  activated: [
    {
      label: 'Disempower em mim, exaurir: descartar 1 e comprar 1',
      timing: 'action',
      exhaustSelf: true,
      condition: (_g, self) => self.empowered,
      extraCost: disempowerMe,
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
