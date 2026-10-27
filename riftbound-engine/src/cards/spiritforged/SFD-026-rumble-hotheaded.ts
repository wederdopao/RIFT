import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// As suas Mechs têm [Assault]. Quando eu conquisto, você pode reciclar outra unidade aliada para jogar uma Mech do seu
// descarte. Reduza o custo de energia dela pelo Might da unidade reciclada.
// - "Você pode" no início: decidido ao pôr na pilha (383.3.a); "reciclar ... para jogar" é custo dentro da instrução,
//   pago ao pôr na pilha (383.3.b) e não é alvo (355.10.c.1). A Mech do descarte (zona pública) é alvo (355.10.a).
// - O Might da unidade reciclada é o que ela tinha ao ser reciclada. A Mech pode ser jogada no campo conquistado,
//   mesmo que a reciclada fosse a última unidade lá: o controle continua enquanto a pilha está aberta (RiftJudge #11244).
// Mech: Engine.hasTag (sem diferenciar maiúsculas — Bubble Bot tem "mech" — e contando Experimental Hexplate)
const isMech = (g: any, o: Obj) => g.isUnit(o) && g.hasTag(o, 'Mech');
registerCard({
  code: 'SFD-026',
  auras: [
    {
      keywords: (g, src, u) =>
        src.zone === 'board' && u.zone === 'board' && g.isUnit(u) && u.controller === src.controller && g.hasTag(u, 'Mech')
          ? { assault: 1 }
          : undefined,
    },
  ],
  triggers: [
    {
      on: 'conquer',
      label: 'Reciclar outra unidade aliada para jogar uma Mech do descarte',
      optional: 'reciclar outra unidade sua para jogar uma Mech do seu descarte (custo reduzido pelo Might dela)?',
      cond: (c, ev) =>
        ev.player === c.p &&
        (ev.units || []).includes(c.self.id) &&
        c.g.units().some((u) => u.controller === c.p && u.id !== c.self.id) &&
        c.g.pl[c.p].trash.some((id) => isMech(c.g, c.g.objs[id])),
      targets: [
        {
          prompt: 'Rumble: jogar qual Mech do seu descarte?',
          kind: 'trash',
          filter: (c, o) => o.zone === 'trash' && o.owner === c.p && isMech(c.g, o),
        },
      ],
      extraCost: function* (c) {
        const g = c.g;
        const us = g.units().filter((u) => u.controller === c.p && u.id !== c.self.id);
        if (!us.length) return false;
        const [u] = yield* g.chooseObj(c.p, 'Rumble: reciclar qual outra unidade sua?', us);
        c.data.might = Math.max(0, g.might(u));
        g.say(`${g.pname(c.p)} recicla ${g.name(u)} (Might ${g.might(u)}).`, c.p);
        g.recycleCard(u, { by: c.p });
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const m = c.targets[0][0];
        if (!m || m.zone !== 'trash') return;
        yield* g.playFromEffect(c.p, m, g.printedCost(m), undefined, { discount: c.data.might || 0 });
        if (m.zone === 'trash') g.say(`Rumble: ${g.name(m)} não pôde ser jogada.`, c.p);
      },
    },
  ],
});
