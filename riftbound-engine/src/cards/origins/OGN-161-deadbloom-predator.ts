import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Deflect. Você pode me jogar num campo inimigo ocupado.
// Campo inimigo: controlado por um oponente; ocupado: com alguma unidade (regra 170.11.a). A permissão vale também
// quando a carta é jogada por efeito (Dazzling Aurora: FAQ riftjudge #5654).
registerCard({
  code: 'OGN-161',
  keywords: { deflect: 1 },
  extraPlayBfs: (g, self, p) => {
    const op = (1 - p) as P;
    return g.bfs.map((_, i) => i).filter((i) => g.bfs[i].controller === op && g.unitsAtBf(i).length > 0);
  },
});
