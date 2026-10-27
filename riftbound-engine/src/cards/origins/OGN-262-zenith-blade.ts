import { registerCard } from '../../engine/script';
// Action. Atordoe (Stun) uma unidade inimiga num campo de batalha. Você pode mover uma unidade aliada para o
// campo dessa unidade inimiga.
// Regra 355.12: a unidade aliada do "você pode mover" é alvo escolhido ao jogar, independente da decisão de mover;
// a decisão ("você pode") é tomada na resolução (regra 355.17). O destino é o campo da inimiga na resolução.
registerCard({
  code: 'OGN-262',
  keywords: { action: true },
  spell: {
    label: 'Zenith Blade',
    targets: [
      { prompt: 'Zenith Blade: atordoar qual unidade inimiga num campo?', filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 },
      { prompt: 'Zenith Blade: unidade sua que pode ir para lá (opcional)', filter: (c, o) => o.controller === c.p, min: 0, max: 1 },
    ],
    resolve: function* (c) {
      const g = c.g;
      const e = c.targets[0][0];
      const f = c.targets[1]?.[0];
      if (!e) return;
      const i = g.bfIndex(e);
      g.stun(e, c.p);
      if (!f || f.zone !== 'board' || i < 0 || g.bfIndex(f) === i) return;
      if (yield* g.yesNo(c.p, `Zenith Blade: mover ${g.name(f)} para ${g.name(g.bfs[i].objId)}?`)) g.moveUnits([f], { t: 'bf', i }, c.p);
    },
  },
});
