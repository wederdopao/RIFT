import { registerCard } from '../../engine/script';
// Campo: unidades não podem ser jogadas aqui (nem fichas de unidade, nem unidades escondidas aqui, regra 811.1.d.1).
registerCard({
  code: 'SFD-216',
  auras: [
    {
      playLoc: (g, src, _p, _card, loc) => !(loc.t === 'bf' && loc.i === g.bfOf(src)),
    },
  ],
});
