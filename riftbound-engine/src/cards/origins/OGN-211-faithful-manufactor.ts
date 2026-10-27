import { registerCard } from '../../engine/script';

// Quando você me joga, jogue uma ficha Recruit de 1 de Might aqui.
// "Aqui" é o meu local na resolução; se saí do tabuleiro, a informação é nula e a instrução é ignorada
// (regras 359.3.f.1-2 e 359.3.e.12).
registerCard({
  code: 'OGN-211',
  onPlay: [
    {
      label: 'Ficha Recruit aqui',
      resolve: function* (c) {
        if (c.self.zone === 'board' && c.self.loc) yield* c.g.playTokenG('TOK-RECRUIT', c.p, c.self.loc);
      },
    },
  ],
});
