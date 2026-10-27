import { registerCard } from '../../engine/script';
// Campo: enquanto uma unidade aqui está defendendo sozinha, ela tem -2 de Might. (Sozinha = sem outras unidades aliadas aqui.)
// Passiva, recalculada sempre: a unidade precisa ter a designação de defensora aqui (combate neste campo) e ser a única
// unidade do controlador dela neste campo.
registerCard({
  code: 'UNL-210',
  auras: [
    {
      might: (g, src, t) => {
        const i = g.bfOf(src);
        return i >= 0 && t.zone === 'board' && g.isUnit(t) && t.role === 'defender' && g.bfIndex(t) === i && g.isAlone(t) ? -2 : 0;
      },
    },
  ],
});
