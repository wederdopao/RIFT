import { registerCard } from '../../engine/script';
import { DOMAINS } from '../../engine/types';
// Lenda: [Tap]: [Reaction] – [Add] [A] (power de qualquer domínio: símbolo arco-íris no texto oficial,
// conferido em api.riftcodex.com). Só para jogar spells.
// O pagamento automático usa `adds`: o motor exaure a Kai'Sa quando ela ajuda a pagar um spell. Ativada à mão, o
// power "só para spells" precisa de um pool restrito, que é parte do motor (trabalho em paralelo).
registerCard({
  code: 'OGN-247',
  activated: [
    {
      label: 'Exaurir: adicionar 1 power (só para spells)',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      adds: { power: [[...DOMAINS]], onlySpells: true },
      resolve: function* () {},
    },
  ],
});
