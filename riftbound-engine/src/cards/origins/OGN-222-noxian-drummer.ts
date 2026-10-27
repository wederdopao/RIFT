import { registerCard } from '../../engine/script';

// Quando eu me movo para um campo de batalha, jogue uma ficha Recruit de 1 de Might aqui.
// "Aqui" é o meu local na resolução (regras 359.3.f.1-2); se saí do tabuleiro, a instrução é ignorada (359.3.e.12).
registerCard({
  code: 'OGN-222',
  triggers: [
    {
      on: 'move',
      label: 'Ficha Recruit aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      resolve: function* (c) {
        if (c.self.zone === 'board' && c.self.loc) yield* c.g.playTokenG('TOK-RECRUIT', c.p, c.self.loc);
      },
    },
  ],
});
