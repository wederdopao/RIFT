import { registerCard } from '../../engine/script';

// VEN-095 Shadow Order Disciple: "When I move, you may [Burn 1] to give me +1 [Might] this turn."
// "[do X] to [do Y]" no começo do efeito de um gatilho é o custo dele, pago ao pô-lo na pilha (Core Rules 204.3.a,
// 740.4.a.2): o Burn acontece ao finalizar, mesmo que eu saia antes de o gatilho resolver.
registerCard({
  code: 'VEN-095',
  triggers: [
    {
      on: 'move',
      label: 'Shadow Order Disciple: Burn 1 para +1 Might',
      optional: 'Shadow Order Disciple: Burn 1 para +1 Might neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      extraCost: function* (c) {
        c.g.burn(c.p, 1);
        return true;
      },
      resolve: function* (c) {
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
