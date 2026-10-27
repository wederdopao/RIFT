import { registerCard } from '../../engine/script';

// Sandstone Chimera — "While I'm at a battlefield, players only channel 1 rune at the start of their Channel Phase."
// Aura.channelLimit (vale para os dois jogadores).
registerCard({
  code: 'VEN-036',
  auras: [{ channelLimit: (g, src) => (src.zone === 'board' && g.bfIndex(src) >= 0 ? 1 : undefined) }],
});
