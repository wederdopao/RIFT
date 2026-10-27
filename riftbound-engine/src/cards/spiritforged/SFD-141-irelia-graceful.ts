import { registerCard } from '../../engine/script';

// Os seus spells que me escolhem custam [1] ou [A] a menos (à sua escolha).
// Desconto ao custo total, depois dos custos adicionais (Repeat, Deflect), uma vez por spell mesmo que eu seja
// escolhida duas vezes; cada Irelia diferente escolhida dá o seu desconto (FAQ riftjudge #651, #7074). Pode ser
// combinado em qualquer ordem com descontos que têm mínimo (FAQ #3222). "Escolher" = alvo (355.10).
registerCard({
  code: 'SFD-141',
  auras: [
    {
      spellCostMod: (g, src, card, p, chosen) => {
        if (src.zone !== 'board' || src.controller !== p || g.kind(card) !== 'spell') return undefined;
        // sem alvos escolhidos ainda: estimativa otimista se o spell escolhe alguma coisa
        const picks = chosen ? chosen.some((o) => o.id === src.id) : !!g.script(card).spell?.targets;
        return picks ? { either: 1 } : undefined;
      },
    },
  ],
});
