import { registerCard } from '../../engine/script';

// Grim Apothecary. Ambush. Quando você me joga, você pode devolver uma unidade aliada num campo de batalha à mão do dono.
// - "Você pode" no início: o jogador escolhe ao disparar se põe o gatilho na pilha (patch notes do Unleashed). A unidade é
//   alvo, escolhido ao pôr na pilha (pode ser eu mesma, se estou num campo).
registerCard({
  code: 'UNL-021',
  keywords: { ambush: true },
  triggers: [
    {
      on: 'play',
      label: 'Devolver uma unidade aliada num campo à mão do dono',
      optional: 'devolver uma unidade sua num campo de batalha à mão do dono?',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [
        {
          prompt: 'Grim Apothecary: devolver qual unidade sua num campo à mão do dono?',
          filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) >= 0,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && u.zone === 'board') c.g.returnToHand(u);
      },
    },
  ],
});
