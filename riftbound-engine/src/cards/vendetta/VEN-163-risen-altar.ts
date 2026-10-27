import { registerCard } from '../../engine/script';
// VEN-163 Risen Altar — "[Empower] costs of your units here cost [1] or [Rune] less."
// "Your" = o controlador do campo (190.6.d); o desconto vale para as habilidades [Empower] (827) das unidades dele aqui,
// e o jogador escolhe tirar [1] ou um [Rune] (Engine.abilityCostOptions).
registerCard({
  code: 'VEN-163',
  auras: [
    {
      abilityCostMod: (g, src, holder, a, p) => {
        const i = g.bfOf(src);
        if (i < 0 || !a.empower || !g.isUnit(holder) || g.bfIndex(holder) !== i) return undefined;
        const ctrl = g.bfs[i].controller;
        return ctrl !== null && ctrl === p && holder.controller === ctrl ? { either: 1 } : undefined;
      },
    },
  ],
});
