import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Quando você me joga, escolha um oponente. Ele revela a mão. Escolha uma carta revelada assim e bana-a. Quando ele
// segurar (hold), devolva-a para a mão dele (mesmo que eu não esteja mais no tabuleiro).
// - No 1x1 o oponente é único. A mão não é zona pública: a carta é escolhida na resolução (não é alvo, 355.10.a).
// - "Quando ele segurar" é um gatilho atrasado criado na resolução e independente de mim (RiftJudge #9740): no próximo
//   hold dele, a carta volta se ainda estiver banida (se saiu e voltou, é outro objeto: nada).
registerCard({
  code: 'UNL-169',
  onPlay: [
    {
      label: 'O oponente revela a mão; banir uma carta até ele segurar um campo',
      resolve: function* (c) {
        const g = c.g;
        const op = (1 - c.p) as P;
        const hand = g.pl[op].hand.map((id) => g.objs[id]);
        g.say(`${g.pname(op)} revela a mão: ${hand.length ? hand.map((o) => g.name(o)).join(', ') : '(vazia)'}.`, op);
        if (!hand.length) return;
        const [pick] = yield* g.chooseObj(c.p, `Ashe: banir qual carta da mão de ${g.pname(op)}?`, hand);
        if (!pick || pick.zone !== 'hand') return;
        g.banishObj(pick);
        const id = pick.id; // id, não o objeto (cópia da IA; ver Delayed)
        const ver = pick.zoneVersion;
        g.addDelayed({
          controller: c.p,
          sourceId: c.self.id,
          on: 'hold',
          cond: (cc, ev) => ev.player === op,
          ability: {
            label: 'Devolver a carta banida para a mão do dono',
            resolve: function* (cc) {
              const o = cc.g.objs[id];
              if (o.zone !== 'banish' || o.zoneVersion !== ver) return;
              cc.g.toZone(o, 'hand');
              cc.g.say(`${cc.g.name(o)} volta da banição para a mão de ${cc.g.pname(o.owner)}.`, cc.p);
            },
          },
          once: true,
        });
      },
    },
  ],
});
