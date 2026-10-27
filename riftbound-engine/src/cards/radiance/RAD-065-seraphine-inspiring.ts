import { registerCard } from '../../engine/script';

// Disarm 2. Uma vez por turno, quando você exaure três ou mais unidades aliadas ao mesmo tempo, pode comprar 1.
// - Mover várias unidades juntas as exaure ao mesmo tempo (RiftJudge #12917): um gatilho por exaustão simultânea (o
//   evento 'exhaust' sai uma vez por unidade com a mesma lista `units`; só a primeira dispara).
// - "Uma vez por turno" com "você pode": recusar não conta (383.3.a.2, 383.3.e.2.b) — marcado ao finalizar (prepare).
//   Objeto novo (saiu e voltou) conta de novo.
const key = (turn: number, ver: number) => `${turn}:${ver}`;
registerCard({
  code: 'RAD-065',
  keywords: { disarm: 2 },
  triggers: [
    {
      on: 'exhaust',
      label: 'Exaurir 3+ unidades: comprar 1',
      optional: 'Comprar 1 carta?',
      cond: (c, ev) => {
        const us: any[] = ev.units || [];
        if (!us.length || us[0]?.id !== ev.obj?.id) return false; // uma vez por exaustão simultânea
        const n = us.filter((u) => u && u.controller === c.p && c.g.isUnit(u)).length;
        return ev.player === c.p && n >= 3 && c.self.data?.serOnce !== key(c.g.turn, c.self.zoneVersion);
      },
      prepare: function* (c) {
        if (c.self.data?.serOnce === key(c.g.turn, c.self.zoneVersion)) return false;
        c.self.data = { ...(c.self.data || {}), serOnce: key(c.g.turn, c.self.zoneVersion) };
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
