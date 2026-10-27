import { registerCard } from '../../engine/script';
// Action. Se um oponente estiver a 3 pontos ou menos da vitória, custo 2 a menos. Compre 1 e canalize 1 runa exaurida.
registerCard({
  code: 'OGN-047',
  keywords: { action: true },
  selfCostMod: (g, self, p) => (g.pl[1 - p].points >= g.cfg.victoryScore - 3 ? -2 : 0),
  spell: {
    label: 'Find Your Center',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 1);
      c.g.channel(c.p, 1, true);
    },
  },
});
