import { registerCard } from '../../engine/script';

// Reaction: compre 1 para cada unidade Mighty sua (contadas na resolução).
registerCard({
  code: 'SFD-106',
  keywords: { reaction: true },
  spell: {
    label: 'Show of Strength',
    resolve: function* (c) {
      const n = c.g.units().filter((u) => u.controller === c.p && c.g.isMighty(u)).length;
      if (n) yield* c.g.draw(c.p, n);
      else c.g.say('Show of Strength: nenhuma unidade Mighty.', c.p);
    },
  },
});
