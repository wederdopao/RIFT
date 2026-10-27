import { registerCard } from '../../engine/script';
// Lenda: quando você joga uma unidade, dê +1 de Might a uma unidade neste turno.
// Fichas de unidade também são jogadas (185.2.a). "Uma unidade" é alvo (355.7): qualquer unidade no tabuleiro, escolhida
// ao pôr o gatilho na pilha (inclusive a que acabou de ser jogada); sem nenhuma, o gatilho não vai para a pilha.
registerCard({
  code: 'UNL-183',
  triggers: [
    {
      on: 'play',
      label: '+1 de Might a uma unidade neste turno',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && !ev.spell && c.g.isUnit(ev.obj),
      targets: [{ prompt: 'Rengar, Pridestalker: +1 de Might neste turno em qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 1);
      },
    },
  ],
});
