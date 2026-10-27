import { registerCard } from '../../engine/script';
// Signature Spell (Lillia): [Reaction]. Anule um spell. Quem o controla não pode jogar spells neste turno.
// - O spell é alvo (escolhido ao jogar). Anulado, ele não conta como jogado (426.1.b; RiftJudge #10711: Time Warp anulado
//   não dá turno). A proibição vale para o controlador do spell anulado até o fim do turno, por qualquer via (mão,
//   escondida, Flow, efeito). Se o alvo saiu da pilha antes, nada acontece (as duas instruções dependem dele).
registerCard({
  code: 'UNL-190',
  keywords: { reaction: true },
  spell: {
    label: 'Lilting Lullaby',
    targets: [{ prompt: 'Lilting Lullaby: anular qual spell?', kind: 'spell' }],
    resolve: function* (c) {
      const g = c.g;
      const sp = c.targets[0][0];
      const it = sp && g.chain.find((x) => x.cardId === sp.id);
      if (!it) return;
      const who = it.controller;
      g.counter(it);
      g.addEffect({ player: who, flag: 'cantPlaySpells', until: 'turn' });
      g.say(`${g.pname(who)} não pode jogar spells neste turno.`, who);
    },
  },
});
