import { registerCard } from '../../engine/script';
// [Tap]: Reaction — Add [2]. Use só para jogar spells. (Habilidades de Add não usam a pilha.)
// A energia fica marcada no pool como "só para spells" (não paga outras coisas) e a habilidade entra no pagamento
// de spells (429.3).
registerCard({
  code: 'OGS-014',
  activated: [
    {
      label: 'Adicionar [2] (só para jogar spells)',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      adds: { energy: 2, onlySpells: true }, // o motor põe no pool, com a restrição
      resolve: function* () {},
    },
  ],
});
