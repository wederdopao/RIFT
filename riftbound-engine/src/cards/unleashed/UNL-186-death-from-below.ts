import { registerCard, type AbilityDef } from '../../engine/script';
import { E } from '../helpers';
// Signature Spell (Pyke), com errata: mate uma unidade num campo. Então, se ela tinha 3 de Might ou menos, faça isto: você
// pode jogar este card do seu descarte por [A].
// - "Então ... faça isto:" é um gatilho reflexivo (387-388): vai para a pilha depois que o spell termina de resolver (já no
//   descarte). "Você pode" no começo do efeito: o jogador escolhe se ele vai para a pilha. Ao resolver, joga a carta do
//   descarte com custo base [A] (power de qualquer domínio), escolhendo alvo de novo; dá para repetir enquanto houver
//   como pagar (RiftJudge #10865).
// - O Might é o da unidade ao ser morta. Se o alvo ficou ilegal (Gust, morreu antes), a morte não acontece e o Might é
//   nulo: sem o gatilho (RiftJudge #9400, #9402, #10423, #10751, #10848; regra 359.3.e.12).
registerCard({
  code: 'UNL-186',
  spell: {
    label: 'Death from Below',
    targets: [{ prompt: 'Death from Below: matar qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const g = c.g;
      const t = c.targets[0][0];
      if (!t || t.zone !== 'board') return;
      const m = g.might(t);
      yield* g.killG(t);
      if (m > 3) return;
      const cardId = c.self.id;
      const reflex: AbilityDef = {
        label: 'jogar Death from Below do descarte por [A]',
        optional: 'jogar Death from Below do seu descarte por [A]?',
        resolve: function* (cc) {
          const card = cc.g.objs[cardId];
          if (!card || card.zone !== 'trash' || card.owner !== cc.p) return cc.g.say('Death from Below não está no seu descarte.', cc.p);
          yield* cc.g.playFromEffect(cc.p, card, E(0, 'any'));
        },
      };
      g.pending.push({ controller: c.p, sourceId: cardId, ability: reflex, ev: { type: 'play' }, label: reflex.label, reflexive: true });
    },
  },
});
