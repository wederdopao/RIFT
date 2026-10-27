import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { disempowerMe } from '../vendetta/leg-helpers';
// VEN-153 Ambessa, Matriarch of War
// "When you empower something else, empower me": o gatilho dispara mesmo comigo já Empowered (meu estado não está na
// condição; 441.1.c: aí nada acontece). Só conta quem ficou Empowered de fato (441.2.a: empowerObj só emite nesse caso).
registerCard({
  code: 'VEN-153',
  triggers: [
    {
      on: 'empower',
      label: 'Empower em mim',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && ev.obj.id !== c.self.id,
      resolve: function* (c) {
        c.g.empowerObj(c.self, c.p);
      },
    },
  ],
  activated: [
    {
      label: 'Disempower em mim, [Rune], exaurir: preparar uma unidade',
      exhaustSelf: true,
      cost: E(0, 'any'),
      condition: (_g, self) => self.empowered,
      extraCost: disempowerMe,
      targets: [{ prompt: 'Ambessa: preparar qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.ready(u, c.p);
      },
    },
  ],
});
