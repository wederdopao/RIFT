import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Obj, P } from '../../engine/types';

// Action: cada oponente revela o topo do Main Deck. Escolha uma, bana-a e jogue-a ignorando o custo.
// Depois recicle o resto. (No 1x1 há só uma carta revelada; não sobra nada para reciclar.)
// Revelar o topo dispara "ao olhar ou revelar" da carta (Nocturne, Horrifying: o dono pode bani-la antes).
// Se a carta escolhida não puder ser jogada (spell sem alvo, jogador impedido...), ela fica banida
// (RiftJudge FAQ #2978: o banimento da errata serve de proteção para isso).
registerCard({
  code: 'OGN-025',
  keywords: { action: true },
  spell: {
    label: 'Blind Fury',
    resolve: function* (c) {
      const g = c.g;
      const revealed: Obj[] = [];
      for (const q of [0, 1] as P[]) {
        if (q === c.p || !g.pl[q].mainDeck.length) continue;
        // revealTop: substituições de revelar (Void Hatchling), Nocturne e "ao ser revelada" (Undertitan)
        for (const top of yield* g.revealTop(q, 1)) revealed.push(top);
      }
      if (!revealed.length) {
        g.say('Blind Fury: não há carta revelada para jogar.');
        return;
      }
      const [pick] = yield* g.chooseObj(c.p, 'Blind Fury: qual carta banir e jogar ignorando o custo?', revealed);
      g.banishObj(pick);
      yield* g.playFromEffect(c.p, pick, E(0));
      if (pick.zone === 'banish') g.say(`${g.name(pick)} não pôde ser jogada e fica banida.`);
      for (const o of revealed) if (o !== pick && o.zone === 'mainDeck') g.recycleCard(o);
    },
  },
});
