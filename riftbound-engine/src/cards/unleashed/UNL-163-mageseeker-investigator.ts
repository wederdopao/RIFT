import { registerCard } from '../../engine/script';
import { DOMAINS } from '../../engine/types';

// Oponentes têm de pagar [A] para cada unidade além da primeira para mover várias unidades para o meu campo ao mesmo
// tempo.
// - É um custo aplicado (204.4; o exemplo da regra é esta carta): pago quando o movimento acontece, sem pilha e sem
//   resposta (204.4.b); quem não pode ou não quer pagar não faz o movimento (204.4.c). Vale para movimento padrão e por
//   efeito (o custo é do movimento, não da origem). [A] = power de qualquer domínio.
// - "Meu campo" = o campo onde estou; na base não há custo. Conta só as unidades que de fato se movem para cá.
registerCard({
  code: 'UNL-163',
  auras: [
    {
      moveCost: (g, src, units, to, mover) => {
        if (mover === src.controller || to.t !== 'bf') return undefined;
        const i = g.bfIndex(src);
        if (i < 0 || to.i !== i || units.length < 2) return undefined;
        return { energy: 0, power: Array.from({ length: units.length - 1 }, () => [...DOMAINS]) };
      },
    },
  ],
});
