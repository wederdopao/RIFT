import { registerCard } from '../../engine/script';
import { DOMAINS } from '../../engine/types';
// Lenda: [Tap]: [Reaction] — [Add] [A] (símbolo arco-íris: power de qualquer domínio, api.riftcodex.com). Use só para
// jogar gear ou usar habilidades de gear.
// O power vai para a parte "só para gear" do pool (motor: pool.only, usos gear e gearAbility); o pagamento automático exaure o Ornn quando
// ele ajuda a pagar um gear ou o custo de uma habilidade de gear (Equip, por exemplo).
// Pagar o Equip pelo Weaponmaster não ativa o Equip (821.1.c.6), então este power não paga esse custo.
registerCard({
  code: 'SFD-189',
  activated: [
    {
      label: 'Exaurir: adicionar 1 power (só para gear)',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      adds: { power: [[...DOMAINS]], onlyGear: true },
      resolve: function* () {},
    },
  ],
});
