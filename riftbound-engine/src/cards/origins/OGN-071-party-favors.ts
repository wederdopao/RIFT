import { registerCard } from '../../engine/script';

// Cada outro jogador escolhe Cartas ou Runas. Cartas: você e ele compram 1. Runas: você e ele canalizam 1 runa exaurida.
registerCard({
  code: 'OGN-071',
  spell: {
    label: 'Party Favors',
    resolve: function* (c) {
      const g = c.g;
      const o = (1 - c.p) as 0 | 1;
      const [pick] = yield* g.ask(o, 'choose', `Party Favors: ${g.pname(o)}, escolha Cartas ou Runas`, [
        { id: 'cards', label: 'Cartas (vocês dois compram 1)' },
        { id: 'runes', label: 'Runas (vocês dois canalizam 1 runa exaurida)' },
      ]);
      g.say(`${g.pname(o)} escolhe ${pick === 'cards' ? 'Cartas' : 'Runas'} (Party Favors).`, o);
      if (pick === 'cards') {
        yield* g.draw(c.p, 1);
        yield* g.draw(o, 1);
      } else {
        g.channel(c.p, 1, true);
        g.channel(o, 1, true);
      }
    },
  },
});
