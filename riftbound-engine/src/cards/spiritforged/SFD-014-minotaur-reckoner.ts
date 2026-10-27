import { registerCard } from '../../engine/script';

// As unidades não podem se mover para a base (de nenhum jogador). Recall não é movimento: continua valendo.
registerCard({
  code: 'SFD-014',
  auras: [{ blockMove: (g, src, u, from, to) => src.zone === 'board' && to.t === 'base' }],
});
