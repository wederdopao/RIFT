import { registerCard } from '../../engine/script';

// No fim do seu turno, se estou num campo, prepare até 4 runas suas.
// As runas estão no tabuleiro, então são alvos escolhidos ao pôr o gatilho na pilha (regras 355.9.a e 355.10);
// "até 4" permite escolher de 0 a 4 (regra 355.13). Runas prontas também são escolhas legais (podem ser
// exauridas em resposta, antes da resolução).
registerCard({
  code: 'OGN-073',
  triggers: [
    {
      on: 'turnEnd',
      label: 'Preparar até 4 runas',
      cond: (c, ev) => ev.player === c.p && c.g.bfIndex(c.self) >= 0,
      targets: [
        {
          prompt: 'Sona: preparar quais runas suas (até 4)?',
          kind: 'rune',
          filter: (c, o) => o.controller === c.p,
          min: 0,
          max: 4,
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        // "se estou num campo" é checado de novo na resolução
        if (c.self.zone !== 'board' || g.bfIndex(c.self) < 0) return;
        const runes = c.targets[0].filter((r) => r.exhausted);
        for (const r of runes) g.ready(r, c.p);
        if (runes.length) g.say(`${g.name(c.self)} prepara ${runes.length} runa(s).`, c.p);
      },
    },
  ],
});
