import { registerCard } from '../../engine/script';

// Yeti Brawler. Quando eu conquisto, se você atribuiu 3 ou mais de dano excedente, jogue duas fichas de gear Gold
// exauridas.
// - "Eu conquisto": estava no campo quando você o conquistou (383.4.c.2.a). O excedente é o que você atribuiu além do
//   letal no combate dessa conquista (ev.excess); conquista sem combate não tem excedente.
// - Ficha de gear sem local vai para a sua base.
registerCard({
  code: 'UNL-018',
  triggers: [
    {
      on: 'conquer',
      label: 'Duas fichas de Gold exauridas',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id) && (ev.excess || 0) >= 3,
      resolve: function* (c) {
        for (let k = 0; k < 2; k++) c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
