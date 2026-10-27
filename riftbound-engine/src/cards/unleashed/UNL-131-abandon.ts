import { registerCard } from '../../engine/script';

// Reaction. Anule um spell. Devolva-o para a mão do dono em vez de pô-lo no descarte. [Predict].
// - O spell é alvo (355.9.a.2), escolhido ao jogar; não pode ser o próprio Abandon (355.9.c). Se ele já tiver saído da
//   pilha ao resolver, o Abandon não tem alvo legal e não faz nada (nem o Predict, 359.3.e).
// - Anulado, o spell não foi jogado: os gatilhos de "quando você joga" dele não disparam (RiftJudge #10782, regra
//   426.1.b). A substituição vale para o destino "descarte"; um spell que seria reciclado ao sair da pilha (390.3.a)
//   continua indo para o deck.
// - Predict = olhar a carta do topo do seu deck e poder reciclá-la (patch notes do Unleashed).
registerCard({
  code: 'UNL-131',
  keywords: { reaction: true },
  spell: {
    label: 'Abandon',
    targets: [{ prompt: 'Abandon: anular qual spell (ele volta para a mão do dono)?', kind: 'spell' }],
    resolve: function* (c) {
      const g = c.g;
      const sp = c.targets[0][0];
      if (!sp) return;
      const item = g.chainItemOf(sp);
      if (item) {
        g.chain = g.chain.filter((x) => x !== item);
        if (item.recycleAfter) g.recycleCard(sp);
        else g.toZone(sp, 'hand');
        g.say(`${item.label} foi anulado (Counter) e volta para a mão de ${g.pname(sp.owner)}.`);
      }
      yield* g.predict(c.p, 1);
    },
  },
});
