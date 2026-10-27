import { registerCard } from '../../engine/script';
// Outras unidades aliadas têm +1 de Might aqui (no mesmo lugar que eu).
registerCard({
  code: 'OGS-013',
  auras: [
    {
      might: (g, src, u) => (u.id !== src.id && u.controller === src.controller && g.locEq(u.loc, src.loc) ? 1 : 0),
    },
  ],
});
