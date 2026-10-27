import { registerCard } from '../../engine/script';

// Gear. [Tap]: Reaction — Add [Calm]. O pagamento automático usa esta habilidade (isAdd + addPower).
registerCard({
  code: 'OGN-081',
  activated: [
    {
      label: 'Exaurir: Add [Calm]',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      addPower: 'Calm',
      resolve: function* (c) {
        const pw = c.g.pl[c.p].pool.power;
        pw.Calm = (pw.Calm || 0) + 1;
      },
    },
  ],
});
