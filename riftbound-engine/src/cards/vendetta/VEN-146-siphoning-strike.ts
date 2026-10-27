import { registerCard } from '../../engine/script';
// VEN-146 Siphoning Strike — "When it dies this turn" é gatilho atrasado só do mesmo objeto: se ela sair do tabuleiro e
// voltar, é outro objeto (124) e não conta (versão de zona da foto da morte, como Deadly Flourish).
registerCard({
  code: 'VEN-146',
  spell: {
    label: 'Siphoning Strike',
    targets: [{ prompt: 'Siphoning Strike: qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const n = g.runesOf(c.p).length >= 7 ? 7 : 4;
      const uid = u.id;
      const ver = u.zoneVersion;
      g.dealDamage(u, n, c.self);
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'die',
        once: true,
        untilTurn: g.turn,
        cond: (_cc, ev) => ev.obj?.id === uid && ev.snap?.zoneVersion === ver,
        ability: {
          label: 'Canalizar 1 runa exausta',
          resolve: function* (cc) {
            cc.g.channel(cc.p, 1, true);
          },
        },
      });
    },
  },
});
