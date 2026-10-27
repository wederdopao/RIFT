import { registerCard } from '../../engine/script';

// As suas unidades ficha têm +1 de Might (fichas de unidade que você controla, em qualquer local).
registerCard({
  code: 'UNL-077',
  auras: [
    {
      might: (g, src, t) => (t.token && g.isUnit(t) && t.controller === src.controller ? 1 : 0),
    },
  ],
});
