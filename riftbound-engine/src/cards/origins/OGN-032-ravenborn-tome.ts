import { registerCard } from '../../engine/script';

// Gear. [Tap]: a próxima spell que você jogar neste turno causa 1 de Bonus Damage (cada dano dela +1).
registerCard({
  code: 'OGN-032',
  activated: [
    {
      label: 'Exaurir: a próxima spell causa +1 de dano',
      exhaustSelf: true,
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, nextPlay: 'spell', bonusDamage: 1, until: 'turn' });
        c.g.say(`A próxima spell de ${c.g.pname(c.p)} neste turno causa 1 de Bonus Damage.`, c.p);
      },
    },
  ],
});
