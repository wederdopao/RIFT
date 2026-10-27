import { registerCard } from '../../engine/script';

// Entro pronta. Quando você me joga, jogue uma ficha Mech pronta de 3 de Might aqui.
registerCard({
  code: 'RAD-009',
  entersReady: () => true,
  onPlay: [
    {
      label: 'Jogar uma ficha Mech pronta aqui',
      resolve: function* (c) {
        const loc = c.self.zone === 'board' ? c.self.loc : undefined;
        if (loc) yield* c.g.playTokenG('TOK-MECH', c.p, loc, true);
      },
    },
  ],
});
