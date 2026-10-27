import { registerCard } from '../../engine/script';

// Quando você joga um spell no turno de um oponente, você pode me exaurir para jogar uma ficha de gear Gold exaurida.
// - "Jogar" um spell termina quando ele resolve (regra 419.4.a); spell anulado não foi jogado (FAQ riftjudge #9801).
// - "Você pode me exaurir para...": o custo vem logo depois do "você pode" e é o custo-base do gatilho, decidido e pago
//   ao pôr na pilha (regras 383.3.a e 383.3.b). Exaurida, a carta não tem como pagar: o gatilho não vai para a pilha.
registerCard({
  code: 'SFD-063',
  triggers: [
    {
      on: 'play',
      label: 'Exaurir para jogar uma ficha de Gold',
      optional: 'exaurir esta carta para jogar uma ficha de Gold exaurida?',
      cond: (c, ev) => !!ev.spell && ev.player === c.p && c.g.active !== c.p && !c.self.exhausted,
      canPayExtra: (c) => !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.zone !== 'board' || c.self.exhausted) return false;
        c.g.exhaust(c.self);
        return true;
      },
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
