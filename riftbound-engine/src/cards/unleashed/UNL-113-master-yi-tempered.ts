import { registerCard } from '../../engine/script';

// [Hunt 2]. [Level 6][>] Eu tenho [Deflect] e [Ganking]. Level olha o XP de quem me controla (824.1.c, 824.1.c.1).
registerCard({
  code: 'UNL-113',
  keywords: { hunt: 2 },
  kwMod: (g, self) => (g.levelReached(self, 6) ?{ deflect: 1, ganking: true } : undefined),
});
