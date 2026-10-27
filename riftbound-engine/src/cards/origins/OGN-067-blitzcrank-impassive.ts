import { registerCard } from '../../engine/script';

// Tank. Quando você me joga num campo, você pode mover uma unidade inimiga para cá.
// Quando eu seguro (hold), volte para a mão do meu dono.
registerCard({
  code: 'OGN-067',
  keywords: { tank: true },
  triggers: [
    {
      on: 'play',
      label: 'Puxar uma unidade inimiga para cá',
      optional: 'mover uma unidade inimiga para cá?',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.loc?.t === 'bf',
      targets: [
        {
          prompt: 'Blitzcrank: mover qual unidade inimiga para cá?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) !== c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const i = c.g.bfIndex(c.self);
        if (u && i >= 0 && c.self.zone === 'board') c.g.moveUnits([u], { t: 'bf', i }, c.p);
      },
    },
    {
      on: 'hold',
      label: 'Voltar para a mão',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.returnToHand(c.self);
      },
    },
  ],
});
