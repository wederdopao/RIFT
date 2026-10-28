import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Platewyrm Egg — "This enters exhausted. [Empower] — [1], [Tap]. [Reaction] [Tap]: [Add] [1]. If this is Empowered,
// [Add] [2] instead." O [Add] depende do estado (addsFor), também no pagamento automático (429.3).
registerCard({
  code: 'VEN-075',
  entersReady: () => false,
  empower: { cost: E(1), exhaustSelf: true },
  activated: [
    {
      label: 'Adicionar energia (2 se Empowered)',
      timing: 'reaction',
      isAdd: true,
      exhaustSelf: true,
      addsFor: (_g, self) => ({ energy: self.empowered ? 2 : 1 }),
      resolve: function* () {},
    },
  ],
});
