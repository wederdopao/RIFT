import { registerCard } from '../../engine/script';

// Quando você me escolhe com um spell, compre 1. "Escolher" = pôr como alvo (355.10; FAQ riftjudge #11462, #1318);
// o gatilho vai para a pilha depois que o spell é finalizado e resolve antes dele.
registerCard({
  code: 'SFD-142',
  triggers: [
    {
      on: 'chosen',
      label: 'Comprar 1 (escolhida por um spell seu)',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.by === c.p && !!ev.source && c.g.kind(ev.source) === 'spell',
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
