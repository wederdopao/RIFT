import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
import type { P } from '../../engine/types';
// [Hidden]. Assuma o controle de uma unidade inimiga num campo. Prepare-a. (Começa um combate se houver outros
// inimigos lá; senão, conquista.) Perca o controle dessa unidade e chame-a de volta (recall) no fim do turno.
// - Com o controle trocado, a unidade disputa o campo: se o oponente não tem outras unidades lá, começa um showdown
//   sem combate e ele perde o controle do campo na mesma limpeza (FAQ oficial do Spiritforged, Hostile Takeover).
// - Só a unidade muda de controle; equipamentos presos continuam com quem os controla (regra 718.5.f).
// - No fim do turno (passo final, regra 317.1.a) o controle volta para quem o tinha e a unidade é chamada de volta
//   para a base desse jogador — a do dono, no caso normal (RiftJudge #9494; recall não é movimento, então Vilemaw's
//   Lair não impede). Se a unidade saiu do tabuleiro antes, não é mais aquele objeto e nada acontece.
// - Jogada escondida: o alvo tem de estar naquele campo (regra 811.1.d.2).
registerCard({
  code: 'SFD-202',
  keywords: { hidden: true },
  spell: {
    label: 'Hostile Takeover',
    targets: [{ prompt: 'Hostile Takeover: controlar qual unidade inimiga num campo?', filter: (c, o) => o.controller !== c.p && atBf(c, o) }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0]?.[0];
      if (!u || u.zone !== 'board') return;
      const prev = u.controller as P;
      const ver = u.zoneVersion;
      const uid = u.id; // id, não o objeto: a cópia da IA reaproveita estas funções (ver Delayed)
      u.controller = c.p;
      g.say(`${g.pname(c.p)} assume o controle de ${g.name(u)}.`, c.p);
      g.ready(u, c.p);
      const i = g.bfIndex(u);
      if (i >= 0) g.applyContested(i, c.p);
      // regra 359.3.e.16: efeito atrasado cujo prazo já passou não é criado (jogado já no passo final do turno)
      if (g.phase === 'ending') return;
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'turnEnd',
        once: true,
        untilTurn: g.turn,
        ability: {
          label: 'Hostile Takeover: devolver o controle e chamar a unidade de volta',
          resolve: function* (cc) {
            const u = cc.g.objs[uid];
            if (u.zone !== 'board' || u.zoneVersion !== ver) return;
            if (u.controller === c.p) u.controller = prev;
            cc.g.recall(u);
            cc.g.say(`${cc.g.name(u)} volta para o controle de ${cc.g.pname(u.controller)} e para a base dele (recall).`);
          },
        },
      });
    },
  },
});
