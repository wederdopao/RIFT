import { registerCard } from '../../engine/script';

// [Level 11][>] Eu tenho +4 [Might]. Level olha o XP de quem me controla (824.1.c, 824.1.c.1).
registerCard({
  code: 'UNL-098',
  mightMod: (g, self) => (g.levelReached(self, 11) ? 4 : 0),
});
