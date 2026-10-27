import { registerCard } from '../../engine/script';
import type { Cost, Domain } from '../../engine/types';
// Lenda: se uma unidade sua com Buff fosse morrer, você pode pagar [C] (1 power Body ou Order: 135.2.e.6.c), me
// exaurir e gastar o Buff dela para curá-la, exauri-la e chamá-la de volta para a base (não é movimento) em vez disso.
// Quando você conquista, me prepare.
// O "você pode" é perguntado ao controlador do Sett no momento em que a morte aconteceria (regra 371.2.a).
const cost = (domains: Domain[]): Cost => ({ energy: 0, power: [[...domains]] });
registerCard({
  code: 'OGN-269',
  deathReplacements: [
    {
      label: 'pagar 1 power, exaurir o Sett e gastar o Buff para a unidade voltar curada e exausta para a base',
      optional: true,
      applies: (g, self, dying) =>
        !self.exhausted && dying.controller === self.controller && g.isUnit(dying) && dying.buffs > 0 &&
        g.canPay(self.controller, cost(g.data(self).domains)),
      apply: function* (g, self, dying) {
        const p = self.controller;
        const c = cost(g.data(self).domains);
        if (self.exhausted || dying.buffs <= 0 || !g.canPay(p, c)) return false;
        yield* g.payG(p, c);
        self.exhausted = true;
        g.spendBuff(dying);
        dying.damage = 0;
        dying.exhausted = true;
        g.recall(dying);
        g.say(`${g.name(self)}: ${g.name(dying)} gasta o Buff, é curada e volta exausta para a base em vez de morrer.`, p);
        return true;
      },
    },
  ],
  triggers: [
    {
      on: 'conquer',
      label: 'Preparar o Sett',
      cond: (c, ev) => ev.player === c.p && c.self.exhausted,
      resolve: function* (c) {
        c.g.ready(c.self, c.p); // passa pelo motor (evento 'ready', bloqueios de preparar)
        if (!c.self.exhausted) c.g.say(`${c.g.name(c.self)} fica pronto.`, c.p);
      },
    },
  ],
});
