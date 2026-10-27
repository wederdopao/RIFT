import { registerCard } from '../../engine/script';

// [Hunt 2] (quando eu conquisto ou seguro, ganhe 2 XP — o motor faz o Hunt).
// [Level 3][>] Eu tenho +1 de Might e [Ganking]: habilidade dependente, ativa enquanto o meu controlador tem 3+ XP
// (824.1.b.1, 824.1.c.1).
registerCard({
  code: 'UNL-075',
  keywords: { hunt: 2 },
  mightMod: (g, self) => (g.levelReached(self, 3) ? 1 : 0),
  kwMod: (g, self) => (g.levelReached(self, 3) ? { ganking: true } : undefined),
});
