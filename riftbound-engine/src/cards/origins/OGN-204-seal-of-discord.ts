import { registerCard } from '../../engine/script';

// [Tap]: [Reaction] — [Add] [Chaos]. Usado pelo pagamento automático (addPower).
registerCard({
  code: 'OGN-204',
  activated: [
    {
      label: 'Adicionar 1 Chaos',
      isAdd: true,
      exhaustSelf: true,
      timing: 'reaction',
      addPower: 'Chaos',
      // ativada à mão (fora do pagamento automático) também adiciona o power ao pool
      resolve: function* (c) {
        c.g.addResources(c.p, 0, ['Chaos']);
      },
    },
  ],
});
