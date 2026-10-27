import { registerCard } from '../../engine/script';

// Quando você me joga, jogue aqui uma ficha de Sprite 3 pronta, com Temporary.
// "Aqui" é o local da Sprite Mother na resolução (regra 359.3.f.2); se ela saiu do tabuleiro, não tem local e a
// instrução é ignorada (regra 359.3.e.12).
registerCard({
  code: 'OGN-106',
  onPlay: [
    {
      label: 'Jogar um Sprite aqui',
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board' || !c.self.loc) return g.say('Sprite Mother não está mais em jogo: o Sprite não é jogado.', c.p);
        if (!g.playLocOk(c.p, c.self, c.self.loc)) return g.say('Sprite Mother: a ficha não pode ser jogada nesse local.', c.p);
        yield* g.playTokenG('TOK-SPRITE', c.p, c.self.loc, true); // playTokenG (UNL mind): Zilean, Time Mage
      },
    },
  ],
});
