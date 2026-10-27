import { registerCard } from '../../engine/script';

// Legion: quando você me joga, me prepare. As outras unidades aliadas têm +1 de Might aqui.
// "Aqui" é o meu local, inclusive a base (riftjudge FAQ #7494; regra 462.2.b trata a base como "here").
registerCard({
  code: 'OGN-243',
  onPlay: [
    {
      label: 'Legion: ficar pronto',
      prepare: function* (c) {
        return c.g.legion(c.self, c.p);
      },
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self);
        c.g.say(`${c.g.name(c.self)} fica pronto.`);
      },
    },
  ],
  auras: [
    {
      might: (g, src, t) =>
        src.zone === 'board' && t.id !== src.id && t.controller === src.controller && g.isUnit(t) && g.locEq(t.loc, src.loc) ? 1 : 0,
    },
  ],
});
