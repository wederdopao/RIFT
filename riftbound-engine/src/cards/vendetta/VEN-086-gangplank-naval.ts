import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// VEN-086 Gangplank, Naval
// [Empowered] "If a spell or ability that chooses me would stun me, give me -[Might], or return me to hand, give me +3
// [Might] instead." — substituição (CardScript.replaceChosen): o +3 não tem duração escrita, vale enquanto ele estiver
// no tabuleiro (como 801.3.a.3 para palavras-chave).
registerCard({
  code: 'VEN-086',
  empower: E(0, 'Body', 'Body'),
  replaceChosen: (g, self) => {
    if (!self.empowered || self.zone !== 'board') return false;
    g.addEffect({ target: self.id, might: 3, until: 'perm' });
    g.say(`${g.name(self)} recebe +3 de Might em vez disso.`, self.controller);
    return true;
  },
});
