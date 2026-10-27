import { registerCard } from '../../engine/script';

// Swain, Visionary — [Vision]. "When I conquer, if you've played a non-token unit, a non-token gear, and a spell this
// turn, you score 1 point." Checagem de existência: um unit gear (Patched Porobot) conta como unidade e como gear
// (RiftJudge #11866, FAQ #12166); a condição é checada quando ele conquista (383.2.a.1; FAQ #12019).
registerCard({
  code: 'VEN-065',
  keywords: { vision: 1 },
  triggers: [
    {
      on: 'conquer',
      label: 'Ganhar 1 ponto (unidade, gear e spell jogados neste turno)',
      cond: (c, ev) => {
        const g = c.g;
        if (ev.player !== c.p || !(ev.units || []).includes(c.self.id)) return false;
        const played = g.pl[c.p].played.map((id) => g.objs[id]).filter((o) => o && !o.token);
        return played.some((o) => g.isUnit(o)) && played.some((o) => g.isGear(o)) && played.some((o) => g.kind(o) === 'spell');
      },
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Swain, Visionary');
      },
    },
  ],
});
