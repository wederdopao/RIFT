import { registerCard } from '../../engine/script';

// Quando você me joga, jogue uma ficha Mech de 3 de Might aqui.
registerCard({
  code: 'RAD-049',
  onPlay: [
    {
      label: 'Jogar uma ficha Mech aqui',
      resolve: function* (c) {
        const loc = c.self.zone === 'board' ? c.self.loc : undefined;
        if (loc) yield* c.g.playTokenG('TOK-MECH', c.p, loc);
      },
    },
  ],
});
