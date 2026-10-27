import { registerCard } from '../../engine/script';
import { DOMAINS } from '../../engine/types';

// Este entra exaurido. [Reaction] [Tap]: [Add] [A]. [Level 6] [Reaction] [Tap]: [Add] [1][A].
// A segunda habilidade é dependente de Level: só pode ser ativada enquanto você tem 6+ XP (727.1.c.3). Ambas são
// habilidades de [Add] (resolvem na hora, 429.2) e entram no pagamento automático; com 6+ XP o jogador escolhe qual usar.
registerCard({
  code: 'UNL-049',
  entersReady: () => false,
  activated: [
    {
      label: 'Exaurir: adicionar 1 power de qualquer domínio',
      exhaustSelf: true,
      isAdd: true,
      timing: 'reaction',
      adds: { power: [[...DOMAINS]] },
      resolve: function* () {},
    },
    {
      label: 'Level 6 — exaurir: adicionar 1 de energia e 1 power de qualquer domínio',
      exhaustSelf: true,
      isAdd: true,
      timing: 'reaction',
      condition: (g, self) => g.levelReached(self, 6),
      adds: { energy: 1, power: [[...DOMAINS]] },
      resolve: function* () {},
    },
  ],
});
