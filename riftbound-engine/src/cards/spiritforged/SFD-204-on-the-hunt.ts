import { registerCard } from '../../engine/script';
// Prepare as suas unidades (todas as que você controla quando o spell resolve).
registerCard({
  code: 'SFD-204',
  spell: {
    label: 'On the Hunt',
    resolve: function* (c) {
      const g = c.g;
      for (const u of g.units().filter((x) => x.controller === c.p)) g.ready(u, c.p);
      g.say(`${g.pname(c.p)} prepara as suas unidades.`, c.p);
    },
  },
});
