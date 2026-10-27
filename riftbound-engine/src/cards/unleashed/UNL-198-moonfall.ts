import { registerCard } from '../../engine/script';
// Signature Spell (Diana): [Action]. Escolha um campo onde você tem unidades. Você pode mover até uma unidade inimiga
// para aquele campo. Então dê -2 de Might às unidades inimigas lá neste turno.
// - Alvos, ao jogar: o campo ("onde você tem unidades" é restrição de alvo, 355.10.b) e até uma unidade inimiga (355.13),
//   que não pode já estar lá (mover exige mudar de local, 355.4.a; RiftJudge #11426). O campo continua alvo válido mesmo
//   se as suas unidades saírem dele (RiftJudge #12510).
// - "Você pode mover": decidido na resolução (355.12). Quem já disputava o campo continua atacante (RiftJudge #9407, #11193).
// - O -2 vale para as unidades inimigas que estão lá na resolução (depois do movimento); quem chega depois não recebe
//   (RiftJudge #10856).
registerCard({
  code: 'UNL-198',
  keywords: { action: true },
  spell: {
    label: 'Moonfall',
    targets: [
      {
        prompt: 'Moonfall: escolha um campo onde você tem unidades',
        kind: 'battlefield',
        bfFilter: (c, i) => c.g.unitsAtBf(i, c.p).length > 0,
      },
      {
        prompt: 'Moonfall: mover até uma unidade inimiga para esse campo (pode não escolher nenhuma)',
        min: 0,
        max: 1,
        filter: (c, o) => {
          const b = c.targets[0]?.[0];
          const i = b ? c.g.bfOf(b) : -1;
          return o.controller !== c.p && i >= 0 && c.g.bfIndex(o) !== i;
        },
      },
    ],
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const b = c.targets[0]?.[0];
      const i = b ? g.bfOf(b) : -1;
      if (i < 0) return;
      const u = c.targets[1]?.[0];
      if (u && u.zone === 'board' && (yield* g.yesNo(c.p, `Moonfall: mover ${g.describe(u)} para ${g.name(b!)}?`))) g.moveUnits([u], { t: 'bf', i }, c.p);
      for (const e of g.unitsAtBf(i).filter((x) => x.controller !== c.p)) g.giveMight(e, -2);
    },
  },
});
