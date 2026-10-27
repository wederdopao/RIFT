import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quando você escolhe uma unidade aliada, você pode pagar [1] e me exaurir para comprar 1.
// "Escolher" = pôr como alvo com um spell ou habilidade sua (355.10; FAQ riftjudge #11462 e #1318: escolhas feitas
// na resolução, sem alvo, não contam). O custo é pago ao pôr o gatilho na pilha (383.3.b): já exaurido, não dá.
// Os dois custos são pagos juntos: com dois gatilhos ao mesmo tempo (spell que escolhe duas unidades aliadas), o
// segundo, com a Wheel já exaurida, não pode ser pago e não cobra o [1] (383.3.b.1). É habilidade de gear: o [1]
// pode vir de recursos "só para gear" (asPayFor gearAbility).
const ONE = E(1);
registerCard({
  code: 'SFD-144',
  triggers: [
    {
      on: 'chosen',
      label: 'Pagar [1] e exaurir para comprar 1',
      optional: 'Pagar [1] e exaurir Spirit Wheel para comprar 1?',
      cond: (c, ev) => ev.by === c.p && !!ev.obj && ev.obj.zone === 'board' && c.g.isUnit(ev.obj) && ev.obj.controller === c.p && !c.self.exhausted,
      extraCost: function* (c) {
        const g = c.g;
        if (c.self.exhausted || c.self.zone !== 'board') return false;
        if (!g.asPayFor('gearAbility', () => g.canPay(c.p, ONE))) return false;
        yield* g.asPayForG('gearAbility', g.payG(c.p, ONE));
        g.exhaust(c.self);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
