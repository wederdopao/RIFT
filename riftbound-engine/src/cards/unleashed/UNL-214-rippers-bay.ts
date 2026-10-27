import { registerCard } from '../../engine/script';
import { E, bfIdx } from '../helpers';
// Campo: quando uma unidade aqui é devolvida à mão de um jogador, esse jogador pode pagar [1] para canalizar 1 runa exaurida.
// - "Esse jogador" (o dono, para cuja mão ela volta) faz a escolha e paga: ele controla a habilidade (190.6.c).
// - "Pagar [1] para" é custo dentro da instrução, pago ao pôr o gatilho na pilha; "pode" decide se ele vai.
// - Carta escondida devolvida à mão (Pack of Wonders) não é "uma unidade aqui": carta virada não é unidade (355.9.a.3).
registerCard({
  code: 'UNL-214',
  triggers: [
    {
      on: 'returnToHand',
      label: 'Pagar [1] para canalizar 1 runa exaurida',
      optional: 'pagar [1] para canalizar 1 runa exaurida?',
      controller: (_g, _src, ev) => (ev.obj ? ev.obj.owner : null),
      cond: (c, ev) => !!ev.obj && !ev.facedown && c.g.isUnit(ev.obj) && ev.loc?.t === 'bf' && ev.loc.i === bfIdx(c) && ev.obj?.owner === c.p && c.g.canPay(c.p, E(1)),
      cost: E(1),
      resolve: function* (c) {
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
