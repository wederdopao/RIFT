import { registerCard } from '../../engine/script';
// Campo: unidades não podem se mover daqui para a base. (Recall não é movimento.)
registerCard({
  code: 'OGN-295',
  auras: [{ blockMove: (g, src, u, from, to) => from.t === 'bf' && from.i === g.bfOf(src) && to.t === 'base' }],
});
