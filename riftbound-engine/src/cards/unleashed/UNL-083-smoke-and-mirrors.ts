import { registerCard } from '../../engine/script';

// [Hidden]. [Action]. Escolha uma unidade que você controla e outra unidade que você controla em outro local. Se pelo
// menos uma delas tem [Temporary], mova cada uma para o local da outra. Compre 1.
// - Jogado a partir de Hidden: a primeira tem de estar naquele campo; a segunda, pela própria restrição do texto, pode
//   estar em qualquer outro local (exemplo da regra 811.1.d.2.a; RiftJudge #10085, #11449).
// - O Temporary é checado na resolução; os dois locais são lidos antes de mover (troca simultânea).
// - Se uma ou as duas ficaram ilegais, não há troca, mas a compra acontece (359.3.e.1 e 359.3.e.5).
registerCard({
  code: 'UNL-083',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Smoke and Mirrors',
    alwaysResolve: true,
    targets: [
      { prompt: 'Smoke and Mirrors: escolha uma unidade sua', filter: (c, o) => o.controller === c.p },
      {
        prompt: 'Smoke and Mirrors: escolha outra unidade sua em outro local',
        ignoreHidden: true,
        filter: (c, o) => {
          const a = c.targets[0]?.[0];
          return o.controller === c.p && !!a && o.id !== a.id && !c.g.locEq(o.loc, a.loc);
        },
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const a = c.targets[0][0];
      const b = c.targets[1]?.[0];
      if (a && b && a.zone === 'board' && b.zone === 'board' && (g.kw(a).temporary || g.kw(b).temporary)) {
        const la = a.loc!;
        const lb = b.loc!;
        g.moveUnits([a], lb, c.p);
        g.moveUnits([b], la, c.p);
      }
      yield* g.draw(c.p, 1);
    },
  },
});
