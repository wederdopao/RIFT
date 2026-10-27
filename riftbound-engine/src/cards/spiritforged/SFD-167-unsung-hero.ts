import { registerCard } from '../../engine/script';

// Deathknell: se eu era Mighty, compre 2.
// "Era Mighty" olha o Might no momento da morte (informação guardada antes de ir para o descarte, 808.1.d.3;
// RiftJudge #4157, #8975, #9318).
registerCard({
  code: 'SFD-167',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: se era Mighty, comprar 2',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        if ((c.ev!.might ?? 0) >= 5) yield* c.g.draw(c.p, 2);
        else c.g.say('Unsung Hero não era Mighty ao morrer.');
      },
    },
  ],
});
