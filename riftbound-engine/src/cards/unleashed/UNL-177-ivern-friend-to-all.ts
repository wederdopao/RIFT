import { registerCard } from '../../engine/script';

// Ao me jogar, escolha Bird, Cat, Dog ou Poro. Eu ganho essa tag.
// Quando eu conquisto ou seguro, ganhe 1 ponto se as suas unidades tiverem entre elas todas estas tags: Bird, Cat, Dog
// e Poro.
// - A escolha "ao me jogar" é feita durante a jogada (355.1), pelo gancho asPlayed (vale também jogando por efeito ou
//   ignorando custos).
//   A escolha fica em data; a tag é dada (g.giveTag, enquanto eu estiver no tabuleiro) no instante em que entro: no
//   evento 'play', que o motor emite logo depois de me pôr no tabuleiro (a `cond` dá a tag e não põe nada na pilha).
// - A condição dos pontos vem no fim do efeito: é verificada na resolução, com as unidades que você controla.
const TAGS = ['Bird', 'Cat', 'Dog', 'Poro'];
registerCard({
  code: 'UNL-177',
  asPlayed: function* (c) {
    const [t] = yield* c.g.ask(c.p, 'choose', 'Ivern, Friend to All: qual tag ele ganha?', TAGS.map((x) => ({ id: x, label: x })));
    if (!t) return false;
    c.data.ivernTag = t;
    return true;
  },
  triggers: [
    {
      on: 'play',
      label: 'Ganhar a tag escolhida',
      cond: (c, ev) => {
        const t = c.self.data?.ivernTag;
        if (ev.obj?.id === c.self.id && t && !c.g.hasTag(c.self, t)) c.g.giveTag(c.self, t);
        return false;
      },
      resolve: function* () {},
    },
    {
      on: ['conquer', 'hold'],
      label: 'Ganhar 1 ponto se suas unidades têm Bird, Cat, Dog e Poro',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        const g = c.g;
        const us = g.units().filter((u) => u.controller === c.p);
        const missing = TAGS.filter((t) => !us.some((u) => g.hasTag(u, t)));
        if (missing.length) g.say(`Ivern: falta(m) ${missing.join(', ')} entre as suas unidades.`, c.p);
        else g.gainPoints(c.p, 1, 'Ivern, Friend to All');
      },
    },
  ],
});
