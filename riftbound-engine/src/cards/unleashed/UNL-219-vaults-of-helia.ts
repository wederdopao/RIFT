import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura (hold) aqui, as suas unidades que não são fichas custam [1] a mais para jogar neste turno.
// Efeito que dura o turno (não depende de o campo continuar aqui): aumenta a energia do custo de toda unidade não-ficha que
// você jogar neste turno, de onde for (aumento, 356.3; motor: TempEffect.playCostMod).
registerCard({
  code: 'UNL-219',
  triggers: [
    {
      on: 'hold',
      label: 'Suas unidades não-ficha custam [1] a mais neste turno',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, until: 'turn', playCostMod: { energy: 1, kind: 'unit', nonToken: true } });
        c.g.say(`As unidades não-ficha de ${c.g.pname(c.p)} custam [1] a mais neste turno.`, c.p);
      },
    },
  ],
});
