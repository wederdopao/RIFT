import { registerCard } from '../../engine/script';

// Deflect. Quando eu conquisto, compre 1 ou canalize 1 runa exaurida.
registerCard({
  code: 'OGN-155',
  keywords: { deflect: 1 },
  triggers: [
    {
      on: 'conquer',
      label: 'Comprar 1 ou canalizar 1 runa exaurida',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        const [m] = yield* c.g.ask(c.p, 'choose', 'Qiyana: comprar 1 ou canalizar 1 runa exaurida?', [
          { id: 'draw', label: 'Comprar 1' },
          { id: 'channel', label: 'Canalizar 1 runa exaurida' },
        ]);
        if (m === 'channel') c.g.channel(c.p, 1, true);
        else yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
