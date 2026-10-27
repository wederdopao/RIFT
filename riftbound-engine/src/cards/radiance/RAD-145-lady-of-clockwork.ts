import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// RAD-145 Lady of Clockwork
// "At the start of your Main Phase, you may pay [1] to choose a friendly gear. It becomes a unit gear with Might equal to
// its Energy cost until you choose another gear with me." — g.makeUnitGear: o gear é unidade e gear ao mesmo tempo.
// Patch notes das Core Rules do Radiance (Lady of Clockwork):
// - o gear anterior deixa de ser unidade quando o gatilho é finalizado (o gear novo é escolhido); o novo só vira unidade
//   na resolução — entre os dois, nenhum é unidade (g.endUnitGear ao finalizar);
// - equipamento escolhido se desanexa ao virar unidade; equipamento anexado ao gear anterior continua anexado;
// - gear com Deploy que vira unidade num campo que você não controla deixa o campo disputado (makeUnitGear).
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
      // último passo da finalização (depois de escolher o gear e pagar o [1])
      extraCost: function* (c) {
        c.g.endUnitGear(c.self);
        return true;
      },
      resolve: function* (c) {
        const gear = c.targets[0][0];
        if (gear && gear.zone === 'board') c.g.makeUnitGear(gear, c.self);
      },
    },
  ],
});
