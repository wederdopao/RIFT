import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// RAD-145 Lady of Clockwork
// "At the start of your Main Phase, you may pay [1] to choose a friendly gear. It becomes a unit gear with Might equal to
// its Energy cost until you choose another gear with me." — g.makeUnitGear: o gear é unidade e gear ao mesmo tempo
// (combate, Might, movimento; e efeitos de gear) até a Lady escolher outro gear.
registerCard({
  code: 'RAD-145',
  triggers: [
    {
      on: 'mainStart',
      label: 'Pagar [1]: um gear aliado vira unit gear',
      optional: 'pagar [1] para escolher um gear aliado (ele vira unit gear com Might = custo de energia)?',
      cond: (c, ev) => ev.player === c.p,
      cost: E(1),
      targets: [{ prompt: 'Lady of Clockwork: qual gear aliado vira unit gear?', kind: 'gear', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const gear = c.targets[0][0];
        if (gear && gear.zone === 'board') c.g.makeUnitGear(gear, c.self);
      },
    },
  ],
});
