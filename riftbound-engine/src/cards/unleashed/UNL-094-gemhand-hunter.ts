import { registerCard } from '../../engine/script';

// [Hunt]. [Level 6][>] Eu tenho +1 [Might]. Level olha o XP de quem me controla (824.1.c, 824.1.c.1).
registerCard({
  code: 'UNL-094',
  keywords: { hunt: 1 },
  mightMod: (g, self) => (g.levelReached(self, 6) ? 1 : 0),
});
