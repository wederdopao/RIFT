import { registerCard } from '../../engine/script';

// Exaurir: Reaction – Add [1]. Entra no pagamento (429.3) e também pode ser ativado à mão.
registerCard({
  code: 'OGN-098',
  activated: [
    {
      label: 'Exaurir: adicionar 1 de energia',
      exhaustSelf: true,
      isAdd: true,
      timing: 'reaction',
      adds: { energy: 1 }, // o motor põe no pool (à mão ou durante um pagamento)
      resolve: function* () {},
    },
  ],
});
