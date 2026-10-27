import { registerCard } from '../../engine/script';

// Quando você me joga, jogue uma ficha Sand Soldier de 2 de Might aqui.
// "Aqui" é o meu local na resolução; se saí do tabuleiro, a instrução é ignorada (regras 359.3.f.1-2 e 359.3.e.12).
registerCard({
  code: 'SFD-157',
  onPlay: [
    {
      label: 'Ficha Sand Soldier aqui',
      resolve: function* (c) {
        if (c.self.zone === 'board' && c.self.loc) yield* c.g.playTokenG('TOK-SAND', c.p, c.self.loc);
      },
    },
  ],
});
