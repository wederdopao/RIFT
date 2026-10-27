import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip — [Caos], reciclar 2 cartas do seu descarte. Efeito (da unidade equipada): quando eu conquisto ou seguro,
// você pode jogar uma unidade do seu descarte (pagando os custos dela).
// - Equip com custo não padrão (818.1.c.3): equipCost [Caos] + equipExtra "reciclar 2 do seu descarte" (o motor faz o
//   Equip: alvo, timing da fase principal, pilha; precisa de 2 cartas no descarte, FAQ riftjudge #8719, #10819). O
//   Weaponmaster tira o [Caos] (o [A] a menos cobre power de qualquer domínio) e ainda exige reciclar 2 (#10704).
// - O efeito é acrescentado à unidade (136.2.c): "eu" é a unidade, "você" quem a controla. "Você pode" no início:
//   decidido ao pôr o gatilho na pilha, com a unidade do descarte como alvo (zona pública, 355.10.a). Na resolução ela
//   é jogada como de costume, ignorando o timing (local, custos, Accelerate; FAQ #8429, #9486); o jogador pode
//   recusar pagar (444.2.a).
registerCard({
  code: 'SFD-150',
  equipCost: E(0, 'Chaos'),
  equipExtra: {
    label: 'reciclar 2 cartas do seu descarte',
    canPay: (g, gear, p) => g.pl[p].trash.length >= 2,
    pay: function* (c) {
      const g = c.g;
      const trash = g.pl[c.p].trash.map((id) => g.objs[id]);
      if (trash.length < 2) return false;
      const picks = yield* g.chooseObj(c.p, 'Last Rites: reciclar quais 2 cartas do seu descarte?', trash, 2, 2);
      yield* g.recycleCards(picks, { by: c.p });
      return true;
    },
  },
  // texto de efeito (CardScript.equipped): c.self = a unidade equipada, c.p = quem a controla
  equipped: {
    triggers: [
      {
        on: ['conquer', 'hold'],
        label: 'Jogar uma unidade do seu descarte',
        optional: 'Jogar uma unidade do seu descarte (pagando os custos dela)?',
        cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
        targets: [
          {
            prompt: 'Last Rites: jogar qual unidade do seu descarte?',
            kind: 'trash',
            filter: (c, o) => o.owner === c.p && o.zone === 'trash' && c.g.isUnit(o),
          },
        ],
        resolve: function* (c) {
          const g = c.g;
          const card = c.targets[0][0];
          if (!card) return;
          const cost = g.printedCost(card);
          if (!g.canPay(c.p, g.cheapestCost(c.p, card, { base: cost, add: { energy: 0, power: [] }, plain: [], post: [] })))
            return g.say(`Last Rites: sem recursos para jogar ${g.name(card)}.`, c.p);
          if (!(yield* g.yesNo(c.p, `Last Rites: pagar os custos de ${g.name(card)} e jogá-la do descarte?`))) return;
          yield* g.playFromEffect(c.p, card, cost);
        },
      },
    ],
  },
});
