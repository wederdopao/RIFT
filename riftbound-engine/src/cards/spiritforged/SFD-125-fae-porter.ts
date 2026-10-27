import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Loc } from '../../engine/types';

// Quando eu me movo para um campo de batalha, você pode pagar [Caos] para mover uma unidade sua para o mesmo campo.
// "Você pode pagar X para Y" no início: o custo é pago ao pôr o gatilho na pilha (regra 383.3.b) e a unidade é alvo
// escolhido nessa hora. "O mesmo campo" é o campo para onde eu me movi (informação da condição, regra 359.3.f.3).
registerCard({
  code: 'SFD-125',
  triggers: [
    {
      on: 'move',
      label: 'Mover uma unidade sua para o mesmo campo',
      optional: 'Pagar [Caos] para mover uma unidade sua para o mesmo campo de batalha?',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      cost: E(0, 'Chaos'),
      // unidade que já está nesse campo (eu, inclusive) não pode ser escolhida: não há destino válido (355.4.a, 355.16)
      targets: [{ prompt: 'Fae Porter: mover qual unidade sua?', filter: (c, o) => o.controller === c.p && !c.g.locEq(o.loc, c.ev!.to) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const to = c.ev!.to as Loc;
        if (u) c.g.moveUnits([u], to, c.p);
      },
    },
  ],
});
