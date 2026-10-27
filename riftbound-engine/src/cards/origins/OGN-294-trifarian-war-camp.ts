import { registerCard } from '../../engine/script';
// Campo: unidades aqui têm +1 de Might (inclusive atacantes).
registerCard({
  code: 'OGN-294',
  auras: [{ might: (g, src, u) => (g.bfIndex(u) >= 0 && g.bfIndex(u) === g.bfOf(src) ? 1 : 0) }],
});
