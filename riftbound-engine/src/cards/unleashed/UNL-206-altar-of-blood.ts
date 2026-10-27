import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Campo: se uma unidade aqui fosse morrer durante o combate, o controlador dela pode pagar [A][A][A] para curá-la,
// exauri-la e chamá-la de volta (recall) em vez disso.
// - Substituição de morte opcional (369-371) que vale para qualquer unidade aqui, de qualquer jogador; quem decide e paga
//   é o controlador da unidade, controle o campo quem controlar (RiftJudge #12024; 190.6.c).
// - Só durante um combate neste campo (inclusive as mortes por dano de combate na limpeza); não vale num showdown sem
//   combate (#12024). Com mortes simultâneas, o jogador do turno decide primeiro (373.1; #11503).
// - A unidade chamada de volta não está mais no campo quando a conquista acontece (RiftJudge #12761).
const COST = E(0, 'any', 'any', 'any');
registerCard({
  code: 'UNL-206',
  deathReplacements: [
    {
      label: 'pagar [A][A][A] para curá-la, exauri-la e chamá-la de volta para a base',
      optional: true,
      controller: (_g, _self, dying) => dying.controller,
      applies: (g, self, dying) => {
        const i = g.bfOf(self);
        return i >= 0 && g.isUnit(dying) && g.bfIndex(dying) === i && !!g.showdown?.combat && g.showdown.bf === i && g.canPay(dying.controller, COST);
      },
      apply: function* (g, _self, dying) {
        const p = dying.controller;
        if (!g.canPay(p, COST)) return false;
        yield* g.payG(p, COST);
        dying.damage = 0;
        dying.exhausted = true;
        g.recall(dying);
        g.say(`${g.name(dying)} é curada, exaurida e volta para a base (Altar of Blood).`, p);
        return true;
      },
    },
  ],
});
