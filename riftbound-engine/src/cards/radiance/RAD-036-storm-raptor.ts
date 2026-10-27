import { registerCard } from '../../engine/script';

// Deflect. Quando uma unidade inimiga atordoada morre aqui, compre 1.
registerCard({
  code: 'RAD-036',
  keywords: { deflect: 1 },
  triggers: [
    {
      on: 'die',
      label: 'Unidade inimiga atordoada morreu aqui: comprar 1',
      cond: (c, ev) => {
        const i = c.g.bfIndex(c.self);
        return i >= 0 && !!ev.snap?.stunned && ev.controller !== c.p && ev.loc?.t === 'bf' && ev.loc.i === i && c.g.isUnit(ev.obj);
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
