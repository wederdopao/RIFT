import { registerCard } from '../../engine/script';
// Lenda: [Level 6] suas unidades têm +1 de Might. [Level 11] suas unidades entram prontas.
// Level é dependente (824, 727): cada passiva só vale enquanto o controlador da lenda tem 6+ / 11+ de XP (checado a cada
// cálculo). "Suas unidades" = unidades que ele controla; "entram prontas" vale para as que ele joga (fichas também).
registerCard({
  code: 'UNL-191',
  auras: [
    {
      might: (g, src, t) => (t.zone === 'board' && g.isUnit(t) && t.controller === src.controller && g.levelReached(src, 6) ? 1 : 0),
      enterReady: (g, src, u) => g.isUnit(u) && u.controller === src.controller && g.levelReached(src, 11),
    },
  ],
});
