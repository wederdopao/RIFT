import { registerCard } from '../../engine/script';

// Você pode me jogar num campo aberto. Unidades aliadas podem ser jogadas em campos abertos.
registerCard({
  code: 'OGN-193',
  playToOpen: true,
  auras: [{ playToOpen: (g, src, unit, p) => src.zone === 'board' && src.controller === p }],
});
