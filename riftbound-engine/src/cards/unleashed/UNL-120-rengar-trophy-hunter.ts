import { registerCard } from '../../engine/script';

// [Ambush]. Eu posso usar o [Ambush] num campo de batalha onde há unidades inimigas, mesmo sem unidades suas lá.
// (Errata de 03/04/2026.) "Ambush" como verbo = jogar com as permissões do Ambush (822.1.d): o campo com inimigos vira
// campo de Ambush (CardScript.ambushBfs): local válido e [Reaction] ao ser jogado lá. Se as inimigas saírem antes de a
// jogada terminar, o local deixa de valer (822.3: o motor confere de novo com `c`). Também vale quando um efeito me joga
// sem fixar o local (RiftJudge #11535, Dazzling Aurora); um efeito que fixa a base não muda (#12689). Se eu entro num
// campo que o oponente disputou primeiro, sou o defensor (#10056).
registerCard({
  code: 'UNL-120',
  keywords: { ambush: true },
  ambushBfs: (g, self, p) => g.bfs.map((_, i) => i).filter((i) => g.unitsAtBf(i).some((u) => u.controller !== p)),
});
