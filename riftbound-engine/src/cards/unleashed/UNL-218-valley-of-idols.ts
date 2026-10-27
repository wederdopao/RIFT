import { registerCard } from '../../engine/script';
import { E, bfIdx } from '../helpers';
// Campo: quando um jogador joga uma unidade aqui, ele pode pagar [1] para dar um [Buff] a ela.
// - Quem jogou a unidade faz a escolha e paga: ele controla a habilidade (190.6.c). "Pagar [1] para" é custo dentro da
//   instrução, pago ao pôr o gatilho na pilha; "pode" decide se ele vai. Fichas de unidade também são jogadas (185.2.a).
// - "Ela" é a unidade jogada (sem escolha): se saiu do tabuleiro antes de resolver, não há o que buffar.
// - "Aqui" é o local da jogada (ev.playLoc), mesmo que a unidade entre em outro lugar (Baron Nashor no Baron Pit: FAQ
//   do Baron Nashor, Hunters' Circle e The Exile; 355.2, 369.3).
registerCard({
  code: 'UNL-218',
  triggers: [
    {
      on: 'play',
      label: 'Pagar [1] para dar um Buff à unidade jogada',
      optional: 'pagar [1] para dar um Buff à unidade jogada aqui?',
      controller: (_g, _src, ev) => (ev.player !== undefined && !ev.spell ? ev.player : null),
      cond: (c, ev) =>
        !ev.spell && !!ev.obj && c.g.isUnit(ev.obj) && (ev.playLoc ?? ev.loc)?.t === 'bf' && (ev.playLoc ?? ev.loc).i === bfIdx(c) && ev.player === c.p && c.g.canPay(c.p, E(1)) && (ev.unlVer ??= ev.obj.zoneVersion) >= 0,
      cost: E(1),
      resolve: function* (c) {
        const u = c.ev!.obj;
        const v = c.ev!.unlVer ?? u.zoneVersion; // versão da unidade quando foi jogada
        if (u.zone === 'board' && u.zoneVersion === v) c.g.buff(u, c.p);
      },
    },
  ],
});
