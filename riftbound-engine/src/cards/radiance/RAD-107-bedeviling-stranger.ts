import { registerCard } from '../../engine/script';

// "When you play me, choose a battlefield. If there are 4 or more units there, you may return an enemy unit there to its
// owner's hand." O campo e a unidade inimiga são alvos escolhidos ao pôr o gatilho na pilha (355.10, 355.12: em "you may
// [ação]" as escolhas são alvos, independentes da decisão); o "you may" no meio do efeito e a contagem de 4+ unidades
// ficam para a resolução (383.3.a.3). Jogada de Hidden: os dois alvos naquele campo (811.1.d.2).
registerCard({
  code: 'RAD-107',
  keywords: { hidden: true },
  triggers: [
    {
      on: 'play',
      label: 'Escolher um campo; com 4+ unidades, devolver uma unidade inimiga',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [
        { prompt: 'Bedeviling Stranger: escolha um campo de batalha', kind: 'battlefield' },
        {
          prompt: 'Bedeviling Stranger: qual unidade inimiga nesse campo poderá voltar para a mão? (opcional)',
          min: 0,
          filter: (c, o) => {
            const b = c.targets[0]?.[0];
            return !!b && o.controller !== c.p && c.g.bfIndex(o) === c.g.bfOf(b);
          },
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const b = c.targets[0][0];
        const u = c.targets[1]?.[0];
        const i = b ? g.bfOf(b) : -1;
        if (i < 0 || !u || u.zone !== 'board' || g.unitsAtBf(i).length < 4) return;
        if (!(yield* g.yesNo(c.p, `Devolver ${g.name(u)} para a mão do dono?`))) return;
        g.returnToHand(u);
      },
    },
  ],
});
