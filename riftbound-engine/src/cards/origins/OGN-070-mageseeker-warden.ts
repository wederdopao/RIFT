import { registerCard } from '../../engine/script';

// Enquanto estou num campo, oponentes só podem jogar unidades na base deles.
// Enquanto estou num campo, spells e habilidades não podem preparar unidades e gear inimigos.
// Fichas de unidade também são "jogadas" (regras 185.2.a e 350.2): o motor aplica playLoc em createToken.
registerCard({
  code: 'OGN-070',
  auras: [
    {
      playLoc: (g, src, p, card, loc) => !(src.zone === 'board' && g.bfIndex(src) >= 0 && p !== src.controller && loc.t !== 'base'),
      blockReady: (g, src, o) =>
        src.zone === 'board' && g.bfIndex(src) >= 0 && o.controller !== src.controller && (g.isUnit(o) || g.isGear(o)),
    },
  ],
});
