import { registerCard } from '../../engine/script';

// Legion: quando você me joga, jogue duas fichas Recruit de 1 de Might aqui.
// "Aqui" é o meu local na resolução; se saí do tabuleiro, a instrução é ignorada (regras 359.3.f.1-2 e 359.3.e.12).
registerCard({
  code: 'OGN-218',
  onPlay: [
    {
      label: 'Legion: duas fichas Recruit aqui',
      prepare: function* (c) {
        return c.g.legion(c.self, c.p);
      },
      resolve: function* (c) {
        const loc = c.self.zone === 'board' ? c.self.loc : undefined;
        if (!loc) return;
        yield* c.g.playTokenG('TOK-RECRUIT', c.p, loc);
        yield* c.g.playTokenG('TOK-RECRUIT', c.p, loc);
      },
    },
  ],
});
