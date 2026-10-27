import { registerCard } from '../../engine/script';

// Action: as unidades que você jogar neste turno entram prontas. Compre 1.
registerCard({
  code: 'OGN-129',
  keywords: { action: true },
  spell: {
    label: 'Confront',
    resolve: function* (c) {
      c.g.addEffect({ player: c.p, flag: 'unitsEnterReady', until: 'turn' });
      c.g.say(`Neste turno, as unidades que ${c.g.pname(c.p)} jogar entram prontas.`, c.p);
      yield* c.g.draw(c.p, 1);
    },
  },
});
