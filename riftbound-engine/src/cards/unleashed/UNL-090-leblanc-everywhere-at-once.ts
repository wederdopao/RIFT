import { registerCard } from '../../engine/script';

// [Backline]. Os seus efeitos de [Temporary] no MEU campo de batalha não disparam.
// - Texto impresso (arte UNL-090) e o da Riot (catálogo oficial): "at my battlefield"; a resposta verificada do RiftJudge
//   (#9863) cita o mesmo texto. O "battlefields" de ref/riftbound/cards.json não tem errata que o sustente (errata.json).
//   Na base eu não tenho campo: nada é bloqueado. Vale para mim mesma ou uma cópia minha (RiftJudge #10040, #12474).
// - É checado quando a Beginning Phase começa (816.1.c): um Temporary que já disparou e está na pilha resolve normalmente,
//   mesmo que eu chegue depois (#11578). Aura.noTemporary, lida pelo motor ao disparar o Temporary.
registerCard({
  code: 'UNL-090',
  keywords: { backline: true },
  auras: [
    {
      noTemporary: (g, src, o) => {
        const i = g.bfIndex(src);
        return i >= 0 && o.controller === src.controller && g.bfIndex(o) === i;
      },
    },
  ],
});
