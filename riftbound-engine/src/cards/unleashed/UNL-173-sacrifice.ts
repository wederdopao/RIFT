import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';

// [Reaction]. Como custo adicional para jogar isto, mate uma unidade aliada [Mighty] (5+ de Might). Compre 2 e canalize
// 1 runa exaurida.
// Custo obrigatório pago ao jogar (357.2); morte substituída (Tactical Retreat, Sett) ainda paga o custo e o spell
// resolve inteiro (357.2.a; RiftJudge #9931, #10651) — mas sem Deathknell da unidade (808.1.d.1).
const mighty = (g: Engine, p: P) => g.units().filter((u) => u.controller === p && g.isMighty(u));
registerCard({
  code: 'UNL-173',
  keywords: { reaction: true },
  mandatoryCost: {
    label: 'Sacrifice: é preciso matar uma unidade Mighty sua para jogá-lo.',
    canPay: (g, self, p) => mighty(g, p).length > 0,
    pay: function* (c) {
      const us = mighty(c.g, c.p);
      if (!us.length) return false;
      const [u] = yield* c.g.chooseObj(c.p, 'Sacrifice: matar qual unidade Mighty sua (custo adicional)?', us);
      if (!u) return false;
      yield* c.g.killG(u, 'é sacrificada');
      return true;
    },
  },
  spell: {
    label: 'Sacrifice',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 2);
      c.g.channel(c.p, 1, true);
    },
  },
});
