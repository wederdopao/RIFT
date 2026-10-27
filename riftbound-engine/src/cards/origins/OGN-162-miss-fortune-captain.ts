import { registerCard } from '../../engine/script';

// Accelerate, Ganking. Na primeira vez que eu me movo em cada turno, você pode preparar outra coisa que esteja exaurida.
// - "A primeira vez ... em cada turno" (regra 383.1): só o primeiro movimento deste objeto no turno dispara; os
//   movimentos são contados por objeto (voltar ao tabuleiro faz um objeto novo).
// - "Você pode" no início do efeito: decidido ao pôr na pilha (regra 383.3.a).
// - "Outra coisa exaurida" é alvo escolhido ao pôr na pilha (regras 355.7 e 402.2): qualquer unidade, gear ou runa no
//   tabuleiro, ou lenda, de qualquer jogador, menos ela mesma.
registerCard({
  code: 'OGN-162',
  keywords: { accelerate: true, ganking: true },
  triggers: [
    {
      on: 'move',
      label: 'Preparar outra coisa exaurida',
      optional: 'Preparar outra coisa que esteja exaurida?',
      cond: (c, ev) => {
        if (ev.unit?.id !== c.self.id) return false;
        const d = (c.self.data ||= {});
        const key = `${c.g.turn}:${c.self.zoneVersion}`;
        if (d.mfMoveKey === key) return false; // não é o primeiro movimento deste objeto no turno
        d.mfMoveKey = key;
        return true;
      },
      targets: [
        {
          prompt: 'Miss Fortune: preparar o quê?',
          kind: 'object',
          filter: (c, o) => o.id !== c.self.id && o.exhausted,
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const o = c.targets[0][0];
        if (!o) return;
        g.ready(o, c.p); // tabuleiro ou lenda: passa pelo motor (evento 'ready', bloqueios de preparar)
        if (!o.exhausted) g.say(`${g.name(o)} fica pronta (Miss Fortune).`);
      },
    },
  ],
});
