import { registerCard } from '../../engine/script';
// Lenda:
// 1. Quando você (ou um aliado) segura um campo, você pode me exaurir para jogar uma ficha de gear Gold exaurida.
//    Exaurir é o custo, pago ao pôr o gatilho na pilha (383.3.b). (1x1: não há aliados.)
// 2. Enquanto a sua pontuação estiver a 3 pontos ou menos da pontuação de vitória, o seu Gold adiciona [1] a mais
//    (motor: aura goldExtra; o Gold usado no pagamento põe [A] + 1 de energia no pool).
registerCard({
  code: 'SFD-201',
  triggers: [
    {
      on: 'hold',
      label: 'Jogar uma ficha Gold exaurida',
      optional: 'Exaurir Renata para jogar uma ficha Gold exaurida?',
      cond: (c, ev) => ev.player === c.p && !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
  auras: [
    {
      goldExtra: (g, src, p) => (p === src.controller && g.cfg.victoryScore - g.pl[p].points <= 3 ? 1 : 0),
    },
  ],
});
