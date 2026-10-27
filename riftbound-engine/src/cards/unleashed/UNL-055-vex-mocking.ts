import { registerCard } from '../../engine/script';

// [Shield]. [Tank]. Quando você atordoa ([Stun]) uma unidade inimiga num campo de batalha, você pode me mover para esse
// campo.
// - "Esse campo" vem da condição do gatilho: o campo da unidade no momento do Stun (359.3.f.3; evento 'stun' traz `bf`).
// - "Você pode": o jogador escolhe se põe o gatilho na pilha (383; patch notes do Unleashed). Na resolução, se eu não
//   estou mais no tabuleiro ou já estou lá, nada acontece.
// - Novo (microdetalhe): se ao finalizar eu já estou naquele campo (ou não posso me mover para lá), o "você pode" não é
//   perguntado — recusar dá no mesmo (383.3.a.2; TriggerDef.possible).
registerCard({
  code: 'UNL-055',
  keywords: { shield: 1, tank: true },
  triggers: [
    {
      on: 'stun',
      label: 'Mover-me para o campo da unidade atordoada',
      optional: 'mover Vex, Mocking para o campo da unidade inimiga atordoada?',
      cond: (c, ev) => ev.player === c.p && !!ev.unit && ev.unit.controller !== c.p && ev.bf !== undefined && ev.bf >= 0,
      possible: (c) => {
        const g = c.g;
        const to = { t: 'bf' as const, i: c.ev!.bf as number };
        return c.self.zone === 'board' && !g.locEq(c.self.loc, to) && !g.moveBlocked(c.self, c.self.loc!, to) && !g.cantMoveBy(c.self, c.p);
      },
      resolve: function* (c) {
        const i = c.ev!.bf as number;
        if (c.self.zone !== 'board') return;
        c.g.moveUnits([c.self], { t: 'bf', i }, c.p);
      },
    },
  ],
});
