import { registerCard } from '../../engine/script';

// Reaction. Mate uma unidade aliada. Se fizer, dê +[Might] igual ao Might dela a outra unidade aliada neste turno.
// Compre 1. (errata de 14/01/2026)
// - As duas unidades são alvos escolhidos ao jogar (RiftJudge #8401, #9315, #10116): sem duas aliadas não dá para jogar.
// - Se a primeira não morre de fato (alvo ilegal, ou a morte é substituída — Soraka, Zhonya), não há bônus
//   (FAQ #8731, #9379, #10643); se a segunda saiu, a primeira ainda morre (FAQ #10226). O "Compre 1" sempre acontece
//   (FAQ #10082), mesmo com os dois alvos ilegais (359.3.e.5).
// - "O Might dela" é o Might no momento da morte (informação de antes de sair do tabuleiro, 808.1.d.3).
registerCard({
  code: 'SFD-163',
  keywords: { reaction: true },
  spell: {
    label: 'Deathgrip',
    targets: [
      { prompt: 'Deathgrip: matar qual unidade aliada?', filter: (c, o) => o.controller === c.p },
      {
        prompt: 'Deathgrip: qual outra unidade aliada recebe o Might?',
        filter: (c, o) => o.controller === c.p && !(c.targets[0] || []).some((x) => x.id === o.id),
      },
    ],
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const victim = c.targets[0][0];
      const other = c.targets[1]?.[0];
      if (victim) {
        const m = g.might(victim);
        const died = yield* g.killG(victim);
        if (died.includes(victim) && other && other.zone === 'board' && m !== 0) g.giveMight(other, m);
      }
      yield* g.draw(c.p, 1);
    },
  },
});
