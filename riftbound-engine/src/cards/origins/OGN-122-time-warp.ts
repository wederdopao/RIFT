import { registerCard } from '../../engine/script';

// Jogue um turno depois deste. Bana esta carta.
registerCard({
  code: 'OGN-122',
  spell: {
    label: 'Time Warp',
    resolve: function* (c) {
      const g = c.g;
      g.extraTurns.push(c.p);
      g.say(`${g.pname(c.p)} vai jogar um turno adicional depois deste.`, c.p);
      if (c.self.zone === 'chain') g.banishObj(c.self);
    },
  },
});
