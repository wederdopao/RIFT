import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import { NO_COST, type Obj, type P } from '../../engine/types';

// Spell, Reaction. Como custo adicional para jogar isto, mate uma unidade aliada. Jogue uma unidade do seu descarte que
// custe no máximo a Energia e no máximo o Power da unidade morta, ignorando o custo dela.
// - Texto impresso: "from your trash" (o cards.json traz "from the trash").
// - A unidade do descarte é alvo (o descarte é público, 355.10.a), escolhida ao jogar, ANTES de pagar os custos: por isso
//   não pode ser a própria unidade que vai morrer pelo custo (RiftJudge #9523, regras 355.5, 355.15, 357.2). Matar não é
//   alvo (355.10.c). Só vale matar uma unidade no tabuleiro (RiftJudge #11102).
// - Não se pode escolher um alvo que nenhuma unidade sua no tabuleiro cubra (355.16), nem matar uma unidade que deixaria o
//   alvo caro demais. Na resolução o alvo é conferido contra a unidade morta (custo impresso; ficha custa 0, 185.3.a.1).
// - "Ignorando o custo": custo base 0; custos adicionais opcionais (Accelerate) ainda podem ser pagos (356.1.b.1,
//   356.1.b.3). O local é a sua base ou um campo que você controla (355.2.a).
type C = { energy: number; power: number };
const costOf = (g: Engine, o: Obj): C => (o.token ? { energy: 0, power: 0 } : { energy: g.data(o).energy, power: g.data(o).power });
const fits = (g: Engine, t: Obj, k: C) => {
  const x = costOf(g, t);
  return x.energy <= k.energy && x.power <= k.power;
};
const friendlyUnits = (g: Engine, p: P) => g.units().filter((u) => u.controller === p);
registerCard({
  code: 'UNL-142',
  keywords: { reaction: true },
  mandatoryCost: {
    label: 'Mate uma unidade aliada (custo adicional)',
    canPay: (g, self, p) => friendlyUnits(g, p).length > 0,
    pay: function* (c) {
      const g = c.g;
      // alvos de todas as execuções (com [Repeat] dado por efeito, Syndra, Transcendent: cada uma escolhe o seu, 820.2.a;
      // todas comparam com a mesma unidade morta)
      const ts: Obj[] = Object.keys(c.data).filter((k) => k.startsWith('trashTarget')).map((k) => g.objs[c.data[k]]).filter(Boolean);
      let us = friendlyUnits(g, c.p);
      if (ts.length) {
        const ok = us.filter((u) => ts.every((t) => fits(g, t, costOf(g, u))));
        if (ok.length) us = ok; // 355.16: não escolher uma morte que deixe um alvo ilegal, se houver outra
      }
      if (!us.length) return false;
      const [u] = yield* g.chooseObj(c.p, 'Heedless Resurrection: matar qual unidade aliada (custo adicional)?', us);
      if (!u) return false;
      c.data.killed = costOf(g, u);
      c.data.killedName = g.name(u);
      yield* g.killG(u, 'é sacrificada (Heedless Resurrection)');
      return true;
    },
  },
  spell: {
    label: 'Heedless Resurrection',
    targets: [
      {
        prompt: 'Heedless Resurrection: jogar qual unidade do seu descarte?',
        kind: 'trash',
        filter: (c, o) => {
          const g = c.g;
          if (o.owner !== c.p || o.zone !== 'trash' || !g.isUnit(o)) return false;
          const k = c.data.killed as C | undefined;
          if (k) return fits(g, o, k); // na resolução: contra a unidade morta
          return friendlyUnits(g, c.p).some((u) => fits(g, o, costOf(g, u))); // ao jogar (355.16)
        },
      },
    ],
    choose: function* (c, ids) {
      c.data[`trashTarget${c.rep}`] = ids[0]?.[0];
      return !!ids[0]?.[0];
    },
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'trash') return;
      yield* g.playFromEffect(c.p, u, NO_COST);
    },
  },
});
