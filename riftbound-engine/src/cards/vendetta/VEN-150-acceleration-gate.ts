import { registerCard } from '../../engine/script';
// VEN-150 Acceleration Gate — "Ready up to 4 units, gear and/or runes." São alvos escolhidos ao jogar (355.5, 355.13: "up
// to" permite zero), no tabuleiro e de qualquer jogador (355.9.a.1).
registerCard({
  code: 'VEN-150',
  spell: {
    label: 'Acceleration Gate',
    targets: [
      {
        prompt: 'Acceleration Gate: preparar até 4 (unidades, gear e/ou runas)',
        kind: 'permanent',
        cands: (c) => c.g.board().filter((o) => c.g.isUnit(o) || c.g.isGear(o) || c.g.kind(o) === 'rune'),
        min: 0,
        max: 4,
      },
    ],
    resolve: function* (c) {
      for (const o of c.targets[0]) c.g.ready(o, c.p);
    },
  },
});
