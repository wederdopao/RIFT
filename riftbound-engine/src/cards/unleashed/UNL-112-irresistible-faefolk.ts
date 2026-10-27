import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Quando eu me movo para um campo de batalha, você pode mover uma unidade inimiga para aquele campo.
// - Ser jogada num campo não é mover (riftboundfaq.com, Irresistible Faefolk #playing-vs-moving).
// - "Você pode": decidido ao pôr o gatilho na pilha (383.3.a); a unidade é alvo escolhido nessa hora. Uma que já está
//   naquele campo não pode ser escolhida (não há movimento possível, 355.4.a).
// - "Aquele campo" vem da condição do gatilho (359.3.f.3): se eu sair antes de resolver, a unidade ainda vai para lá
//   (riftboundfaq.com, #removed-in-response; RiftJudge #11094).
// - Quem contestou o campo primeiro (eu) é o atacante (riftboundfaq.com, #combat-attacker).
registerCard({
  code: 'UNL-112',
  triggers: [
    {
      on: 'move',
      label: 'Mover uma unidade inimiga para este campo',
      optional: 'Mover uma unidade inimiga para o campo para onde eu fui?',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      targets: [{ prompt: 'Irresistible Faefolk: mover qual unidade inimiga?', filter: (c, o) => o.controller !== c.p && !c.g.locEq(o.loc, c.ev!.to) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const to = c.ev!.to as Loc;
        if (u) c.g.moveUnits([u], to, c.p);
      },
    },
  ],
});
