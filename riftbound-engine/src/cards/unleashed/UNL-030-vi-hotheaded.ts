import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Vi, Hotheaded. Deflect. [2][Fury]: dobre o meu Might neste turno.
// - Dobrar = +Might atual (432.1), fixado para o turno; Might negativo dá +0 (477.3.c). Sem [Action]: só na fase principal
//   do seu turno, quantas vezes pagar (RiftJudge #10207, #11796, #11618).
registerCard({
  code: 'UNL-030',
  keywords: { deflect: 1 },
  activated: [
    {
      label: 'Dobrar o meu Might neste turno',
      cost: E(2, 'Fury'),
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.giveMight(c.self, Math.max(0, c.g.might(c.self)));
      },
    },
  ],
});
