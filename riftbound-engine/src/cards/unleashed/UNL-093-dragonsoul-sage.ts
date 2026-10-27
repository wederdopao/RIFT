import { registerCard } from '../../engine/script';

// [Reaction][>] [Tap]: [Add] [1]. Habilidade de [Add]: resolve na hora, sem pilha (429.2), e entra no pagamento
// automático (429.3), como Energy Conduit.
registerCard({
  code: 'UNL-093',
  activated: [
    {
      label: 'Exaurir: adicionar 1 de energia',
      exhaustSelf: true,
      isAdd: true,
      timing: 'reaction',
      adds: { energy: 1 },
      resolve: function* () {},
    },
  ],
});
