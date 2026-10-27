import { registerCard } from '../../engine/script';

// Se você ganhou XP neste turno, eu tenho +1 [Might] e [Ganking]. "Você" = quem me controla.
registerCard({
  code: 'UNL-108',
  mightMod: (g, self) => (g.gainedXpThisTurn(self.controller) > 0 ? 1 : 0),
  kwMod: (g, self) => (g.gainedXpThisTurn(self.controller) > 0 ? { ganking: true } : undefined),
});
