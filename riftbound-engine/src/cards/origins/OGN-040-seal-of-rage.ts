import { registerCard } from '../../engine/script';

// Gear. [Tap]: Reaction – [Add] [Fury]. Entra no pagamento automático.
registerCard({
  code: 'OGN-040',
  activated: [
    {
      label: 'Exaurir: adicionar [Fury]',
      isAdd: true,
      exhaustSelf: true,
      timing: 'reaction',
      addPower: 'Fury',
      resolve: function* (c) {
        const pw = c.g.pl[c.p].pool.power;
        pw.Fury = (pw.Fury || 0) + 1;
      },
    },
  ],
});
