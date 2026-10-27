import { registerCard } from '../../engine/script';

// [Hunt 2] (motor). [Level 3] Eu tenho +1 [Might] e [Deflect] enquanto meu controlador tem 3+ XP (824.1.b.1, 824.1.c).
registerCard({
  code: 'UNL-047',
  keywords: { hunt: 2 },
  mightMod: (g, self) => (g.levelReached(self, 3) ? 1 : 0),
  kwMod: (g, self) => (g.levelReached(self, 3) ? { deflect: 1 } : undefined),
});
