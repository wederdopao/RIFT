import { registerCard } from '../../engine/script';

// As cartas escondidas (Hidden) dos seus oponentes não podem ser reveladas aqui (não podem ser jogadas deste campo).
// Jogar uma carta escondida é revelá-la; as outras revelações (regra 421.4: ao mudar de zona) são só informação e não
// impedem a mudança de zona, então o único efeito de jogo é proibir a jogada a partir do facedown deste campo.
registerCard({
  code: 'OGN-018',
  auras: [
    {
      blockPlay: (g, src, card, p, via) =>
        src.zone === 'board' && via === 'hidden' && p !== src.controller && g.bfIndex(src) >= 0 && g.bfIndex(card) === g.bfIndex(src),
    },
  ],
});
