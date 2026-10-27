import { registerCard } from '../../engine/script';
// Lenda: [Reaction] [Tap]: [Add] [1]. Gaste esta energia só durante showdowns.
// - Habilidade de [Add]: resolve na hora, sem pilha (429.2). Pode ser ativada a qualquer momento, mas a energia vai para a
//   parte "só em showdown" do pool (motor: pool.showdownOnly) e só paga custos enquanto houver um showdown (de combate ou
//   não); o pagamento automático só usa a Diana durante um showdown.
registerCard({
  code: 'UNL-197',
  activated: [
    {
      label: 'Exaurir: adicionar 1 de energia (só para gastar durante showdowns)',
      timing: 'reaction',
      exhaustSelf: true,
      isAdd: true,
      adds: { energy: 1, onlyShowdown: true },
      resolve: function* () {},
    },
  ],
});
