import { registerCard } from '../../engine/script';

// Hidden. As unidades aliadas entram prontas neste turno. Jogue uma ficha de gear Gold exaurida.
// A ficha de gear vai para a sua base (gear é jogado na base; 811.1.d.3 só leva unidades ao campo do Hidden).
registerCard({
  code: 'SFD-004',
  keywords: { hidden: true },
  spell: {
    label: 'Bushwhack',
    resolve: function* (c) {
      const g = c.g;
      g.addEffect({ player: c.p, flag: 'unitsEnterReady', until: 'turn' });
      g.say(`Neste turno, as unidades de ${g.pname(c.p)} entram prontas.`, c.p);
      g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
    },
  },
});
