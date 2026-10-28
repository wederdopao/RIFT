import { registerCard } from '../../engine/script';

// VEN-132 Fallen Feline
// "When you play me, name a spell." é efeito de jogada (gatilho na pilha, 383.4.a): o nome é escolhido na resolução
// (pode ser respondido antes; a proibição só começa depois de nomear). Se eu já saí do tabuleiro, não há o que guardar.
// "While I'm at a battlefield, opponents can't play spells with that name."
registerCard({
  code: 'VEN-132',
  onPlay: [
    {
      label: 'Fallen Feline: nomear uma spell',
      resolve: function* (c) {
        const g = c.g;
        const name = yield* g.nameCardG(c.p, 'Fallen Feline: nomeie uma spell', (d) => d.type.toLowerCase().includes('spell'));
        // guardado com a versão de zona: se eu sair do tabuleiro e voltar, sou outro objeto (124.1) e não tenho nome
        if (c.self.zone === 'board') c.self.data = { ...(c.self.data || {}), named: name, namedZv: c.self.zoneVersion };
      },
    },
  ],
  auras: [
    {
      blockPlay: (g, src, card, p) =>
        src.zone === 'board' &&
        g.bfIndex(src) >= 0 &&
        p !== src.controller &&
        g.kind(card) === 'spell' &&
        !!src.data?.named &&
        src.data.namedZv === src.zoneVersion &&
        g.data(card).name === src.data.named,
    },
  ],
});
