import { registerCard } from '../../engine/script';

// Quando eu conquisto, você pode matar um gear. Se fizer, me dê um Buff.
registerCard({
  code: 'OGN-056',
  triggers: [
    {
      on: 'conquer',
      label: 'Matar um gear para ganhar Buff',
      optional: 'matar um gear para ganhar um Buff?',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id) && c.g.board().some((o) => c.g.isGear(o)),
      targets: [{ prompt: 'Adaptatron: matar qual gear?', kind: 'gear' }],
      resolve: function* (c) {
        const gear = c.targets[0][0];
        if (!gear) return;
        yield* c.g.killG(gear);
        if (gear.zone !== 'board') c.g.buff(c.self, c.p);
      },
    },
  ],
});
