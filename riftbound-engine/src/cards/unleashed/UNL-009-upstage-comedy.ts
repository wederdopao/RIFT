import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Upstage Comedy. Repeat [2]. Prepare uma unidade (qualquer uma, em qualquer local). Com Repeat, a segunda execução
// escolhe o próprio alvo (820.2.a).
registerCard({
  code: 'UNL-009',
  repeat: E(2),
  spell: {
    label: 'Upstage Comedy',
    targets: [{ prompt: 'Upstage Comedy: preparar qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u && u.zone === 'board') c.g.ready(u, c.p);
    },
  },
});
