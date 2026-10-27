import { registerCard } from '../../engine/script';

// Action: neste turno, quando qualquer unidade receber dano, mate-a.
registerCard({
  code: 'OGN-221',
  keywords: { action: true },
  spell: {
    label: 'Imperial Decree',
    resolve: function* (c) {
      const g = c.g;
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'damage',
        once: false,
        untilTurn: g.turn,
        ability: {
          label: 'Imperial Decree: matar a unidade que recebeu dano',
          resolve: function* (cc) {
            const u = cc.ev?.unit;
            if (u && u.zone === 'board') yield* cc.g.killG(u, 'morre (Imperial Decree)');
          },
        },
      });
      g.say('Neste turno, toda unidade que receber dano morre.', c.p);
    },
  },
});
