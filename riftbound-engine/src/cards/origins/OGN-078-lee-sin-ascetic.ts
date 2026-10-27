import { registerCard } from '../../engine/script';

// Shield. [Tap]: me dê um Buff. Posso ter qualquer número de buffs.
registerCard({
  code: 'OGN-078',
  keywords: { shield: 1 },
  anyBuffs: true,
  activated: [
    {
      label: 'Exaurir: me dar um Buff',
      exhaustSelf: true,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.buff(c.self, c.p);
      },
    },
  ],
});
