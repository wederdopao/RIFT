import { registerCard } from '../../engine/script';

// Não posso ser escolhida por spells e habilidades inimigas.
registerCard({
  code: 'SFD-105',
  auras: [{ cantBeChosen: (g, src, t, by) => t.id === src.id && src.zone === 'board' && by !== src.controller }],
});
