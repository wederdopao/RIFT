import { registerCard, type AbilityDef } from '../../engine/script';
import { lookRevealUnit } from './UNL-032-double-trouble';

// Quando você me joga ou quando eu seguro (hold): olhe as 3 cartas do topo do seu Main Deck. Você pode revelar uma
// unidade dentre elas e comprá-la. Recicle o resto. Se você revelou um Bird, Cat, Dog ou Poro, faça isto: [Buff] uma
// unidade aliada.
// - "Do this:" é um gatilho reflexivo (387.1): vai para a pilha depois que este efeito termina, e a unidade aliada é
//   alvo escolhido ao pô-lo na pilha (355.10; 355.5.b), como em Arise! e Twisted Fate, Gambler.
// - Olhar/revelar/comprar/reciclar: o mesmo caminho do Double Trouble (lookAtTop, beforeReveal, onReveal).
const PETS = ['Bird', 'Cat', 'Dog', 'Poro'];
const BUFF: AbilityDef = {
  label: 'Buff numa unidade aliada',
  targets: [{ prompt: 'Ivern, Nurturer: dar Buff a qual unidade aliada?', filter: (c, o) => o.controller === c.p }],
  resolve: function* (c) {
    const u = c.targets[0][0];
    if (u) c.g.buff(u, c.p);
  },
};
const LOOK: AbilityDef = {
  label: 'Olhar 3 do topo: comprar uma unidade revelada; Bird/Cat/Dog/Poro dá Buff',
  resolve: function* (c) {
    const g = c.g;
    const r = yield* lookRevealUnit(g, c.p, 'Ivern, Nurturer');
    if (r && PETS.some((t) => g.hasTag(r, t)))
      g.pending.push({ controller: c.p, sourceId: c.self.id, ability: BUFF, ev: c.ev ?? { type: 'play' }, label: BUFF.label, reflexive: true });
  },
};
registerCard({
  code: 'UNL-051',
  onPlay: [LOOK],
  triggers: [
    {
      ...LOOK,
      on: 'hold',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
    },
  ],
});
