import { registerCard } from '../../engine/script';

// Accelerate. Quando eu me movo para um campo de batalha, jogue três fichas Recruit de 1 de Might aqui.
// "Aqui" é o meu local na resolução (359.3.f.2); se saí do tabuleiro, a instrução é ignorada.
registerCard({
  code: 'SFD-179',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'move',
      label: 'Três fichas Recruit aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      resolve: function* (c) {
        for (let k = 0; k < 3; k++) {
          if (c.self.zone !== 'board' || !c.self.loc) return;
          yield* c.g.playTokenG('TOK-RECRUIT', c.p, c.self.loc);
        }
      },
    },
  ],
});
