import { registerCard } from '../../engine/script';

// Se você fosse revelar cartas de um deck, olhe a carta do topo antes. Você pode reciclá-la. Depois revele as cartas.
// Substituição aplicada pelo motor (Engine.beforeReveal) nas instruções que revelam do topo de um deck (principal ou de
// runas), uma vez por instrução (370.2). Olhar o topo do seu deck passa pelos ganchos "ao olhar" (Nocturne).
registerCard({
  code: 'SFD-018',
  beforeReveal: function* (g, self, p, owner, deck) {
    const ids = deck === 'runeDeck' ? g.pl[owner].runeDeck : g.pl[owner].mainDeck;
    if (!ids.length) return;
    const topId = ids[0];
    if (deck === 'mainDeck') {
      const left = yield* g.lookAtTop(p, [topId]); // Nocturne, Horrifying (só no deck do próprio dono)
      if (!left.includes(topId)) return;
    }
    const top = g.objs[topId];
    g.say(`Void Hatchling: ${g.pname(p)} olha a carta do topo do deck${owner !== p ? ` de ${g.pname(owner)}` : ''}${deck === 'runeDeck' ? ' de runas' : ''}.`, p);
    if (yield* g.yesNo(p, `Void Hatchling: o topo é ${g.name(top)}. Reciclar antes de revelar?`)) {
      g.recycleCard(top, { by: p });
      g.say(`Void Hatchling: ${g.pname(p)} recicla a carta do topo.`, p);
    }
  },
});
