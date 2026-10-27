import { registerCard } from '../../engine/script';

// [Level 3][>] Entro pronta. (Com 3+ XP, vale o efeito.)
// - Level é palavra-chave dependente (824.1): "entro pronta" só está ativa enquanto o controlador tem 3+ XP
//   (824.1.b.1, 824.1.c); muda com o controlador (824.1.c.1).
// - "Entro pronta" descreve como a unidade entra: é substituição verificada no momento em que ela entra (Vendetta patch
//   notes, "New Replacement Effects"), com o XP de quem a joga (o.controller já é quem joga).
registerCard({
  code: 'UNL-151',
  entersReady: (g, self) => g.levelReached(self, 3),
});
