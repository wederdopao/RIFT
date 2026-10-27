import { registerCard } from '../../engine/script';

// "[Tap]: Choose an opponent. They must move a unit they control to my battlefield." Pode ser ativada em qualquer lugar
// (fora de um campo não há "my battlefield" e nada se move). O oponente escolhe na resolução (355.10.f: "must" não é
// alvo), entre as unidades dele que podem ir para lá (movimento impedido não é opção); custo aplicado ao movimento é dele
// (204.4).
registerCard({
  code: 'RAD-113',
  keywords: { deflect: 1 },
  activated: [
    {
      label: 'O oponente move uma unidade para o meu campo',
      exhaustSelf: true,
      resolve: function* (c) {
        const g = c.g;
        const i = g.bfIndex(c.self);
        if (i < 0 || c.self.zone !== 'board') return;
        const opp = (1 - c.p) as any;
        const to = { t: 'bf' as const, i };
        const us = g
          .units()
          .filter((u) => u.controller === opp && u.loc && !g.locEq(u.loc, to) && !g.moveBlocked(u, u.loc, to, g.moveBy(opp)) && !g.cantMoveBy(u, opp));
        if (!us.length) return;
        const [u] = yield* g.chooseObj(opp, 'Angler Wyrm: mova uma unidade sua para o campo da Angler Wyrm', us);
        if (u) yield* g.moveUnitsG([u], to, opp);
      },
    },
  ],
});
