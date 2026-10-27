import { registerCard } from '../../engine/script';

// [Tank]. As suas unidades aqui com menos Might do que eu não podem ser escolhidas por spells e habilidades inimigas.
// Habilidade estática (757-758): vale enquanto estou no tabuleiro, comparando o Might atual; alvo que deixa de poder ser
// escolhido erra o alvo na resolução (Engine.legalTargets). "Aqui" é o meu local (campo ou base).
registerCard({
  code: 'UNL-057',
  keywords: { tank: true },
  auras: [
    {
      cantBeChosen: (g, src, t, by) =>
        by !== src.controller &&
        g.isUnit(t) &&
        t.zone === 'board' &&
        t.id !== src.id &&
        t.controller === src.controller &&
        g.locEq(t.loc, src.loc) &&
        g.might(t) < g.might(src),
    },
  ],
});
