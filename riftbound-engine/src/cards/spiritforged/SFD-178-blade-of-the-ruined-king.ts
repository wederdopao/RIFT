import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip — [Order], mate uma unidade aliada. Bônus de Might +4.
// - Custo de Equip com parte que não é de recursos (818.1.c.3): equipCost [Order] + equipExtra "matar uma unidade
//   aliada" (matar como custo não é alvo, 355.10.c). Weaponmaster tira o [Order], mas ainda é preciso matar (FAQ #10704).
// - Ordem da regra: alvo primeiro, depois custos (RiftJudge #1747). Matar a própria unidade escolhida torna o alvo
//   ilegal: a ação falha e é desfeita — a não ser que uma substituição a salve (Zhonya, Soraka), e aí o custo conta
//   como pago e o Equip continua (357.2.a; FAQ #1747, #9045, #11534). Sem pelo menos duas unidades aliadas não dá para
//   tentar, salvo quando a única unidade seria salva.
registerCard({
  code: 'SFD-178',
  equipCost: E(0, 'Order'),
  equipExtra: {
    label: 'matar uma unidade aliada',
    canPay: (g, gear, p) => {
      const us = g.units().filter((u) => u.controller === p);
      return us.length >= 2 || us.some((u) => g.deathReps(u).length > 0);
    },
    pay: function* (c) {
      const g = c.g;
      const target = c.data.equipUnit ? g.objs[c.data.equipUnit] : undefined;
      const ver = target?.zoneVersion;
      const us = g.units().filter((u) => u.controller === c.p);
      if (!us.length) return false;
      const [victim] = yield* g.chooseObj(c.p, 'Blade of the Ruined King: matar qual unidade aliada (custo do Equip)?', us);
      yield* g.killG(victim, 'é sacrificada');
      // o alvo morreu pagando o custo: a ação falha (FAQ #1747)
      if (target && (target.zone !== 'board' || target.zoneVersion !== ver || target.controller !== c.p)) return false;
      return true;
    },
  },
});
