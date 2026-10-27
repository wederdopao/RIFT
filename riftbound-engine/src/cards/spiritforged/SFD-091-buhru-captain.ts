import { registerCard } from '../../engine/script';

// Quando você me joga, você pode comprar 1 ou me dar um Buff.
// - "Você pode" no início do efeito: ao pôr o gatilho na pilha decide-se só se ele será executado (regras 383.3.a e
//   383.3.a.1).
// - "Comprar 1 ou me dar um Buff" não é uma lista de modos (355.3 exige a lista com marcadores): é uma escolha que a
//   regra não manda fazer ao finalizar, então é feita na resolução (355.17).
registerCard({
  code: 'SFD-091',
  onPlay: [
    {
      label: 'Comprar 1 ou receber um Buff',
      optional: 'Buhru Captain: usar a habilidade (comprar 1 ou receber um Buff)?',
      resolve: function* (c) {
        const [m] = yield* c.g.ask(c.p, 'choose', 'Buhru Captain: comprar 1 ou me dar um Buff?', [
          { id: 'draw', label: 'Comprar 1' },
          { id: 'buff', label: 'Dar um Buff ao Buhru Captain' },
        ]);
        if (m === 'draw') yield* c.g.draw(c.p, 1);
        else if (c.self.zone === 'board') c.g.buff(c.self, c.p);
      },
    },
  ],
});
