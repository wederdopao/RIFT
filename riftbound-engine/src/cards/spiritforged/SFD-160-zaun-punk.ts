import { registerCard } from '../../engine/script';

// Você pode matar um gear aliado como custo adicional para me jogar. Quando você me joga, se pagou o custo adicional,
// mate um gear.
// - O custo adicional é escolhido ao jogar (355.1.a); o gear morto como custo não é alvo (355.10.c). Qualquer gear seu
//   serve, inclusive um equipamento preso a uma unidade ou uma ficha Gold.
// - "Se você pagou" é parte da condição do gatilho (383.2.a.1): sem o custo, o gatilho não acontece.
// - "Mate um gear" é alvo (qualquer gear, seu ou inimigo), escolhido ao pôr o gatilho na pilha; é obrigatório.
registerCard({
  code: 'SFD-160',
  optionalCosts: [
    {
      label: 'Matar um gear seu como custo adicional?',
      flag: 'punk',
      canPay: (g, self, p) => g.gearOf(p).length > 0,
      pay: function* (c) {
        const gs = c.g.gearOf(c.p);
        if (!gs.length) return false;
        const [x] = yield* c.g.chooseObj(c.p, 'Zaun Punk: matar qual gear seu (custo adicional)?', gs);
        yield* c.g.killG(x, 'é sacrificado');
        return true;
      },
    },
  ],
  onPlay: [
    {
      label: 'Matar um gear',
      prepare: function* (c) {
        return !!c.self.data?.punk;
      },
      targets: [{ prompt: 'Zaun Punk: matar qual gear?', kind: 'gear' }],
      resolve: function* (c) {
        const x = c.targets[0][0];
        if (x) yield* c.g.killG(x);
      },
    },
  ],
});
