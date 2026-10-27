import { registerCard } from '../../engine/script';
// Campo: as unidades aqui com [Temporary] têm [Shield] (+1 de Might enquanto defendem).
// Passiva de campo (vale para unidades de qualquer jogador aqui). Para saber se a unidade tem Temporary é preciso calcular
// as palavras-chave dela, que incluem esta mesma aura: dentro desse cálculo esta aura não dá nada (ela só dá Shield, então
// não muda se a unidade tem Temporary).
let inside = false;
registerCard({
  code: 'UNL-208',
  auras: [
    {
      keywords: (g, src, t) => {
        if (inside) return undefined;
        const i = g.bfOf(src);
        if (i < 0 || !g.isUnit(t) || g.bfIndex(t) !== i) return undefined;
        inside = true;
        try {
          return g.activeKw(t).temporary ? { shield: 1 } : undefined;
        } finally {
          inside = false;
        }
      },
    },
  ],
});
