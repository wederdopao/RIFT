import { registerCard } from '../../engine/script';

// [Tap]: Reaction — Add [Order]. (O pagamento automático usa os campos isAdd/exhaustSelf/addPower.)
registerCard({
  code: 'OGN-245',
  activated: [
    {
      label: 'Exaurir: Add [Order]',
      exhaustSelf: true,
      isAdd: true,
      addPower: 'Order',
      timing: 'reaction',
      resolve: function* (c) {
        const pool = c.g.pl[c.p].pool.power;
        pool.Order = (pool.Order || 0) + 1;
      },
    },
  ],
});
