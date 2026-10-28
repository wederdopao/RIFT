import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// VEN-149 Jayce, Defender of Tomorrow — "[Empower][2][Rune][Rune]. [1], [Tap]: Ready a gear. [Empowered] [1], [Tap]:
// Ready 2 gear." São duas habilidades ativadas; a segunda só existe enquanto Empowered (828.1.b.1). "a gear"/"2 gear"
// são alvos (355.10): gear no tabuleiro, de qualquer jogador (355.9.a.1), escolhidos ao ativar (355.5).
registerCard({
  code: 'VEN-149',
  empower: E(2, 'any', 'any'),
  activated: [
    {
      label: '[1], exaurir: preparar um gear',
      exhaustSelf: true,
      cost: E(1),
      targets: [{ prompt: 'Jayce: preparar qual gear?', kind: 'gear' }],
      resolve: function* (c) {
        const x = c.targets[0][0];
        if (x) c.g.ready(x, c.p);
      },
    },
    {
      label: '[Empowered] [1], exaurir: preparar 2 gear',
      exhaustSelf: true,
      cost: E(1),
      condition: (_g, self) => self.empowered,
      targets: [{ prompt: 'Jayce: preparar quais 2 gear?', kind: 'gear', min: 2, max: 2 }],
      resolve: function* (c) {
        for (const x of c.targets[0]) c.g.ready(x, c.p);
      },
    },
  ],
});
