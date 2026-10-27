import { registerCard } from '../../engine/script';

// [Shield]. Quando eu seguro (hold), jogue aqui uma ficha de unidade Sprite de 3 de Might, pronta, com [Temporary].
// "Aqui" é o meu local na resolução; se saí do tabuleiro, a instrução é ignorada (359.3.f.2, 359.3.e.12).
registerCard({
  code: 'UNL-048',
  keywords: { shield: 1 },
  triggers: [
    {
      on: 'hold',
      label: 'Ficha Sprite pronta aqui',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        if (c.self.zone === 'board' && c.self.loc) yield* c.g.playTokenG('TOK-SPRITE', c.p, c.self.loc, true);
      },
    },
  ],
});
