import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';

// [Ambush]. Como custo adicional para me jogar, mate um Bird, Cat, Dog ou Poro que você controla. Você pode me jogar
// com [Ambush] para o campo dele, mesmo sem outras unidades suas lá. (Errata do Vendetta.)
// - Custo adicional obrigatório: sem um Bird/Cat/Dog/Poro seu, não dá para me jogar (RiftJudge #10014). A unidade é
//   escolhida ao jogar e morre ao pagar (357.2); morte substituída ainda paga o custo (357.2.a).
// - "Ambush para o campo dele" (822.1.d): ambushBfs. Ao escolher o local, os campos onde há um Bird/Cat/Dog/Poro seu
//   (lá você já tem unidades); na checagem de legalidade depois dos custos (c com wolfBf), o campo da unidade morta
//   continua valendo mesmo sem outras unidades suas lá (sem isso, 822.3 desfaria a jogada).
const TAGS = ['Bird', 'Cat', 'Dog', 'Poro'];
const fodder = (g: Engine, p: P): Obj[] => g.units().filter((u) => u.controller === p && TAGS.some((t) => g.hasTag(u, t)));
registerCard({
  code: 'UNL-166',
  keywords: { ambush: true },
  ambushBfs: (g, self, p, c) => {
    if (c) return typeof c.data.wolfBf === 'number' && c.data.wolfBf >= 0 ? [c.data.wolfBf] : [];
    return [...new Set(fodder(g, p).map((u) => g.bfIndex(u)).filter((i) => i >= 0))];
  },
  mandatoryCost: {
    label: 'Stalking Wolf: é preciso matar um Bird, Cat, Dog ou Poro seu para jogá-lo.',
    canPay: (g, self, p) => fodder(g, p).length > 0,
    pay: function* (c) {
      const g = c.g;
      const us = fodder(g, c.p);
      if (!us.length) return false;
      const [u] = yield* g.chooseObj(c.p, 'Stalking Wolf: matar qual Bird, Cat, Dog ou Poro seu (custo adicional)?', us);
      if (!u) return false;
      c.data.wolfBf = g.bfIndex(u);
      yield* g.killG(u, 'é sacrificada');
      return true;
    },
  },
});
