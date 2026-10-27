import { registerCard } from '../../engine/script';

// (BANIDO no padrão) Gear: quando é jogado, descartado ou morto, compre 1.
const draw1 = { label: 'Comprar 1', resolve: function* (c: any) { yield* c.g.draw(c.p, 1); } };
registerCard({
  code: 'OGN-182',
  onPlay: [draw1],
  triggers: [
    { ...draw1, on: 'discard', zone: 'trash', cond: (c, ev) => ev.obj?.id === c.self.id },
    { ...draw1, on: 'die', zone: 'self', cond: (c, ev) => ev.obj?.id === c.self.id },
  ],
});
