import { registerCard } from '../../engine/script';

// "If you would channel runes, channel that many runes plus 1 exhausted rune instead." — só quando o controlador do
// Wyvern canaliza ("you").
registerCard({
  code: 'RAD-092',
  auras: [{ channelExtra: (g, src, p) => (p === src.controller ? 1 : 0) }],
});
