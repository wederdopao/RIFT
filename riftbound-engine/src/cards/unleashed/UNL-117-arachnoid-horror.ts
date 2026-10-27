import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';

// [Hunt 2]. Eu posso ser jogada num campo ocupado se uma unidade inimiga está sozinha lá. Unidades aliadas podem ser
// jogadas num campo ocupado se uma unidade inimiga está sozinha lá.
// - Permissão de local (355.2.b): "sozinha" = sem outras unidades aliadas dela no mesmo local (740.2.a). Vale enquanto
//   a inimiga continuar sozinha: dá para jogar várias unidades lá (RiftJudge #11322); elas entram exauridas.
// - A primeira frase vale para mim na mão (CardScript.extraPlayBfs); a segunda, para as outras unidades que você joga
//   enquanto estou no tabuleiro (Aura.extraPlayBfs). É só local: não dá timing de Reaction nem estende o Ambush
//   (riftboundfaq.com, Ambush #ambush-base).
const loneEnemyBfs = (g: Engine, p: P): number[] =>
  g.bfs.map((_, i) => i).filter((i) => g.unitsAtBf(i).some((u) => u.controller !== p && g.isAlone(u)));

registerCard({
  code: 'UNL-117',
  keywords: { hunt: 2 },
  extraPlayBfs: (g, self, p) => loneEnemyBfs(g, p),
  auras: [{ extraPlayBfs: (g, src, unit, p) => (src.zone === 'board' && p === src.controller && g.isUnit(unit) ? loneEnemyBfs(g, p) : []) }],
});
