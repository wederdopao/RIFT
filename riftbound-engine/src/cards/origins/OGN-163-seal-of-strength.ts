import { registerCard } from '../../engine/script';

// Gear: [Tap]: Reaction — Add [Body]. (Entra no pagamento automático: o gear é exaurido para pagar 1 Body.)
registerCard({
  code: 'OGN-163',
  activated: [
    {
      label: 'Exaurir: adicionar 1 Body',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      addPower: ['Body'],
      resolve: function* (c) {
        const pool = c.g.pl[c.p].pool;
        pool.power.Body = (pool.power.Body || 0) + 1;
      },
    },
  ],
});
