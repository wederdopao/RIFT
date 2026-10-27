import { registerCard } from '../../engine/script';

// Eu não posso me mover para a base. Vale para o movimento padrão e para movimentos por efeito (a instrução é ignorada,
// 359.3.e.6). Recall não é movimento: continua valendo (como Minotaur Reckoner).
registerCard({
  code: 'UNL-111',
  auras: [{ blockMove: (g, src, u, from, to) => src.zone === 'board' && u.id === src.id && to.t === 'base' }],
});
