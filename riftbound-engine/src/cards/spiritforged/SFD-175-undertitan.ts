import { registerCard } from '../../engine/script';

// Quando você me joga, dê +2 de Might neste turno às suas outras unidades. Quando eu sou revelada do seu deck,
// [Add] [2] (2 de energia no pool, na hora, sem pilha). Só revelar conta (olhar não): CardScript.onReveal, chamado por
// Engine.revealTop.
registerCard({
  code: 'SFD-175',
  onPlay: [
    {
      label: '+2 de Might para as suas outras unidades',
      resolve: function* (c) {
        for (const u of c.g.units()) if (u.controller === c.p && u.id !== c.self.id) c.g.giveMight(u, 2);
      },
    },
  ],
  onReveal: function* (g, self, p) {
    g.say(`Undertitan é revelada do deck de ${g.pname(p)}.`, p);
    g.addResources(p, 2);
  },
});
