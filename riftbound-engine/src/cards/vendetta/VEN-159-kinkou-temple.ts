import { registerCard } from '../../engine/script';
// VEN-159 Kinkou Temple
registerCard({
  code: 'VEN-159',
  auras: [{ might: (g, src, t) => (g.isUnit(t) && g.bfIndex(t) >= 0 && g.bfIndex(t) === g.bfOf(src) && g.kw(t).tank ? 1 : 0) }],
});
