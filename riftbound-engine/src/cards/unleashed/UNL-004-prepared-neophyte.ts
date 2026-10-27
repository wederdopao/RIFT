import { registerCard } from '../../engine/script';

// Prepared Neophyte. Se você gastou [4] ou mais para jogar um spell neste turno, tenho +4 de Might.
// - [4] é energia gasta para jogar um mesmo spell (custos adicionais pagos ao jogá-lo, como Repeat, contam). Conta ao
//   pagar, mesmo que o spell seja anulado depois (FAQ oficial do Unleashed, sobre Jhin, Meticulous Killer: "checks the
//   energy spent to play a spell, not whether that spell resolved"). Motor: PlayerState.bigSpell (Engine.noteSpellSpend).
// - "Você" é quem me controla.
registerCard({
  code: 'UNL-004',
  mightMod: (g, self) => (g.pl[self.controller].bigSpell === g.turn ? 4 : 0),
});
