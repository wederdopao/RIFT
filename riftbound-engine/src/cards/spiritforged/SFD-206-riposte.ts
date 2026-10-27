import { registerCard } from '../../engine/script';
// Reaction. Escolha uma unidade aliada e um spell. Anule (Counter) esse spell e dê à unidade +Might igual ao custo de
// energia do spell neste turno.
// - O custo é o de energia impresso, sem modificações (RiftJudge #10029; regra 131.4).
// - Se o spell deixou de ser alvo válido, nada dele vale, nem o +Might (regras 359.3.e.5 e 359.3.e.12); se só a
//   unidade ficou inválida, o spell ainda é anulado.
registerCard({
  code: 'SFD-206',
  keywords: { reaction: true },
  spell: {
    label: 'Riposte',
    targets: [
      { prompt: 'Riposte: qual unidade aliada?', filter: (c, o) => o.controller === c.p },
      { prompt: 'Riposte: anular qual spell?', kind: 'spell' },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0]?.[0];
      const sp = c.targets[1]?.[0];
      if (!sp) return;
      const item = g.chain.find((it) => it.cardId === sp.id);
      if (!item) return;
      const energy = g.data(sp).energy;
      g.counter(item);
      if (u && u.zone === 'board') g.giveMight(u, energy);
    },
  },
});
