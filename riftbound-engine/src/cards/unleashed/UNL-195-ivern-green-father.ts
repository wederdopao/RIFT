import { registerCard } from '../../engine/script';
// Lenda: quando você conquista ou segura, você pode me exaurir para substituir aquele campo por uma ficha de campo Brush.
// - "Me exaurir para" é custo dentro da instrução (355.10.c.1), pago ao pôr o gatilho na pilha; "você pode" decide se
//   ele vai (FAQ oficial do Unleashed, estrutura de gatilhos). "Aquele campo" é o do evento.
// - Substituir (438, núcleo g.replaceWith): a ficha Brush ocupa o lugar do campo herdando controle, estado e efeitos; o
//   campo vai para o banimento como substituído e volta quando você pontua no Brush e escolhe trocar de volta (o script do
//   Brush está em src/cards/tokens.ts; RiftJudge #9490, #9986). Brush num Brush: o novo substitui o anterior e a troca
//   de volta vai para o campo original (#9959). O passivo do campo substituído deixa de valer na hora (FAQ oficial:
//   Aspirant's Climb).
registerCard({
  code: 'UNL-195',
  triggers: [
    {
      on: ['conquer', 'hold'],
      label: 'Substituir o campo por um Brush',
      optional: 'exaurir o Ivern para substituir este campo por uma ficha de campo Brush?',
      cond: (c, ev) => ev.player === c.p && !c.self.exhausted && ev.bf !== undefined,
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const i = c.ev!.bf as number;
        if (!g.bfs[i]) return;
        g.replaceWith(g.bfObj(i), 'TOK-BRUSH', c.p);
      },
    },
  ],
});
