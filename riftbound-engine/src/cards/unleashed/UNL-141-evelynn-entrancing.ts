import { registerCard } from '../../engine/script';

// Campeã 2, Hidden, Backline. Quando você me joga do estado escondido no seu turno, você pode mover uma unidade inimiga
// de outro local para o meu campo de batalha.
// - Só dispara jogada a partir de Hidden (via 'hidden') e no turno de quem a joga; jogada escondida no turno do oponente
//   ou da mão não dispara.
// - "you may" no início do efeito: escolher ao pôr na pilha (383.3.a). A unidade é alvo, escolhida nessa hora; como o
//   texto exige "outro local", a restrição de Hidden não se aplica e ela pode vir da base ou de outro campo (811.1.d.2;
//   RiftJudge #11814).
// - "Meu campo" é conferido na resolução (patch notes do Unleashed, Referents): se a Evelynn saiu do campo (Gust), nada
//   se move (RiftJudge #10903). A unidade tem de continuar inimiga e em outro local.
registerCard({
  code: 'UNL-141',
  keywords: { hidden: true, backline: true },
  triggers: [
    {
      on: 'play',
      label: 'Mover uma unidade inimiga de outro local para o meu campo',
      optional: 'Mover uma unidade inimiga de outro local para o campo da Evelynn?',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.via === 'hidden' && c.g.active === c.p,
      targets: [
        {
          prompt: 'Evelynn: mover qual unidade inimiga (de outro local) para o campo dela?',
          ignoreHidden: true,
          filter: (c, o) => o.controller !== c.p && !c.g.locEq(o.loc, c.self.loc),
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        const i = c.self.zone === 'board' ? g.bfIndex(c.self) : -1;
        if (!u || i < 0 || u.zone !== 'board') return;
        g.moveUnits([u], { t: 'bf', i }, c.p);
      },
    },
  ],
});
