import { registerCard } from '../../engine/script';
// Lenda: no fim do seu turno, prepare até 2 runas.
// As runas estão no tabuleiro (zona pública): são alvos, escolhidos quando o gatilho vai para a pilha
// (regras 355.10 e 355.13 — "até 2" aceita de 0 a 2, então sempre pergunta quando há runa exaurida).
// O texto diz "runas", sem restringir de quem. Preparar uma runa já pronta não faz nada (regra 415.1.c), então só
// as exauridas aparecem como opção.
registerCard({
  code: 'OGS-017',
  triggers: [
    {
      on: 'turnEnd',
      label: 'Preparar até 2 runas',
      cond: (c, ev) => ev.player === c.p,
      targets: [
        {
          prompt: 'Annie: quais runas preparar? (até 2)',
          kind: 'rune',
          filter: (_c, o) => o.exhausted,
          min: 0,
          max: 2,
        },
      ],
      resolve: function* (c) {
        const picks = c.targets[0] || [];
        for (const r of picks) c.g.ready(r, c.p);
        if (picks.length) c.g.say(`Annie prepara ${picks.length} runa(s).`, c.p);
      },
    },
  ],
});
