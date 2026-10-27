import { registerCard } from '../../engine/script';

// Escolha duas unidades. Elas causam uma à outra dano igual ao próprio Might.
// - Duas unidades quaisquer (aliadas ou inimigas), diferentes. O dano é causado pelas unidades (417.6.b.3, como
//   Challenge), ao mesmo tempo, com o Might da resolução (359.3.f.2).
// - Se uma das duas ficou inválida, o Might dela é nulo e ela não pode receber dano: a instrução "uma à outra" não tem
//   como ser seguida e nada acontece (359.3.e.12).
registerCard({
  code: 'UNL-110',
  spell: {
    label: 'Clash of Giants',
    targets: [
      { prompt: 'Clash of Giants: primeira unidade' },
      { prompt: 'Clash of Giants: segunda unidade', filter: (c, o) => o.id !== c.targets[0]?.[0]?.id },
    ],
    resolve: function* (c) {
      const a = c.targets[0][0];
      const b = c.targets[1]?.[0];
      if (!a || !b || a.id === b.id) return;
      const ma = Math.max(0, c.g.might(a));
      const mb = Math.max(0, c.g.might(b));
      c.g.dealDamage(b, ma, a, { byUnit: true });
      c.g.dealDamage(a, mb, b, { byUnit: true });
    },
  },
});
