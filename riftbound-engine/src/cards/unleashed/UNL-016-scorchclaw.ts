import { registerCard } from '../../engine/script';

// Scorchclaw. Hunt 2. [Level 3][>] Tenho +1 de Might e entro pronta.
// - Hunt: gatilho do motor ao conquistar/segurar (823). Level é palavra-chave dependente (824): a habilidade vale enquanto
//   o controlador tem 3+ XP (824.1.c; troca de controlador conta o XP do novo, 824.1.c.1). "Entro pronta" é conferido
//   quando a unidade entra, com o XP de quem a joga (passiva: dentro da função, g.levelReached).
registerCard({
  code: 'UNL-016',
  keywords: { hunt: 2 },
  mightMod: (g, self) => (g.levelReached(self, 3) ? 1 : 0),
  entersReady: (g, self) => g.levelReached(self, 3),
});
