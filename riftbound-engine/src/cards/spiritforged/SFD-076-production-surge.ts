import { registerCard } from '../../engine/script';

// Custa [2] a menos se você controla um Mech. Jogue uma ficha de unidade Mech de 3 de Might na sua base. Compre 1.
registerCard({
  code: 'SFD-076',
  selfCostMod: (g, self, p) => (g.board().some((o) => o.controller === p && g.hasTag(o, 'Mech')) ? -2 : 0),
  spell: {
    label: 'Production Surge',
    resolve: function* (c) {
      yield* c.g.playTokenG('TOK-MECH', c.p, { t: 'base', p: c.p });
      yield* c.g.draw(c.p, 1);
    },
  },
});
