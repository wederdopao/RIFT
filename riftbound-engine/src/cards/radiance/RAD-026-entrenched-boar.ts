import { registerCard } from '../../engine/script';

// Você pode me fazer entrar pronta. Se fizer, não posso me mover neste turno.
registerCard({
  code: 'RAD-026',
  asPlayed: function* (c) {
    const ok = yield* c.g.yesNo(c.p, 'Entrenched Boar: entrar pronta? (não poderá se mover neste turno)');
    c.data.boarReady = ok;
    c.self.data = { ...(c.self.data || {}), boarReady: ok, boarVer: c.self.zoneVersion };
    return true;
  },
  entersReady: (g, self) => !!self.data?.boarReady && self.zoneVersion - (self.data.boarVer ?? -99) <= 2,
  triggers: [
    {
      on: 'play',
      label: 'Não posso me mover neste turno',
      immediate: true,
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.boarReady,
      resolve: function* (c) {
        c.self.noMoveTurn = c.g.turn;
      },
    },
  ],
});
