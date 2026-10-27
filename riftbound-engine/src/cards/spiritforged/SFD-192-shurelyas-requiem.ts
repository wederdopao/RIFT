import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Gear (Equipamento, +2 de Might — o motor soma o bônus impresso). [Unique]. [Equip] [A] (power de qualquer domínio).
// Quando você joga isto, prepare as suas unidades.
// Efeito (texto de efeito, vale para a unidade equipada, regra 136.2.c): "Suas unidades aqui têm [Ganking]." "Suas" =
// do controlador da unidade; "aqui" = o local dela (inclusive ela mesma).
registerCard({
  code: 'SFD-192',
  keywords: { unique: true },
  equipCost: E(0, 'any'),
  onPlay: [
    {
      label: 'Preparar as suas unidades',
      resolve: function* (c) {
        const g = c.g;
        for (const u of g.units().filter((x) => x.controller === c.p)) g.ready(u, c.p);
        g.say(`${g.pname(c.p)} prepara as suas unidades.`, c.p);
      },
    },
  ],
  equipped: {
    auras: [
      {
        // src = a unidade equipada
        keywords: (g, src, t) =>
          src.zone === 'board' && g.isUnit(t) && t.zone === 'board' && t.controller === src.controller && g.locEq(t.loc, src.loc) ? { ganking: true } : undefined,
      },
    ],
  },
});
