import { registerCard } from '../../engine/script';
// Lenda: cada Equipamento seu dá [Assault] (+1 de Might enquanto a unidade equipada ataca).
// "Cada" um: a unidade recebe Assault 1 por Equipamento seu preso a ela (Assault soma entre fontes, regra 806).
// O Equipamento é "seu" (você o controla), mesmo que a unidade seja de outro jogador (regra 718.5.e).
registerCard({
  code: 'SFD-183',
  auras: [
    {
      keywords: (g, src, t) => {
        if (!g.isUnit(t) || t.zone !== 'board') return undefined;
        const n = g.attachedTo(t).filter((x) => x.controller === src.controller && g.data(x).tags.includes('Equipment')).length;
        return n ? { assault: n } : undefined;
      },
    },
  ],
});
