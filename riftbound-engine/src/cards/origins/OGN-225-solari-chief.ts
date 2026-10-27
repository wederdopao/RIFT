import { registerCard } from '../../engine/script';

// Quando você me joga, escolha uma unidade inimiga. Se ela estiver atordoada, mate-a. Senão, atordoe-a.
registerCard({
  code: 'OGN-225',
  onPlay: [
    {
      label: 'Matar unidade atordoada ou atordoar',
      targets: [{ prompt: 'Solari Chief: escolha uma unidade inimiga', filter: (c, o) => o.controller !== c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u) return;
        if (u.stunned) yield* c.g.killG(u);
        else c.g.stun(u, c.p);
      },
    },
  ],
});
