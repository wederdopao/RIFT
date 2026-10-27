import { registerCard } from '../../engine/script';
// Lenda: enquanto uma unidade aliada defende sozinha, ela tem +2 de Might.
registerCard({
  code: 'OGS-019',
  auras: [
    {
      might: (g, src, u) => (u.controller === src.controller && u.role === 'defender' && g.isAlone(u) ? 2 : 0),
    },
  ],
});
