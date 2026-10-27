import { registerCard } from '../../engine/script';

// Quando você me joga, jogue aqui uma ficha de unidade Bird de 1 de Might com [Deflect].
// "Aqui" é o meu local na resolução; se saí do tabuleiro, a instrução é ignorada (regras 359.3.f.1-2 e 359.3.e.12).
registerCard({
  code: 'UNL-033',
  onPlay: [
    {
      label: 'Ficha Bird aqui',
      resolve: function* (c) {
        if (c.self.zone === 'board' && c.self.loc) yield* c.g.playTokenG('TOK-BIRD', c.p, c.self.loc);
      },
    },
  ],
});
