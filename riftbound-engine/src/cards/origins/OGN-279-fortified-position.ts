import { registerCard } from '../../engine/script';
import { bfIdx, youHere } from '../helpers';
// Campo: quando você defende aqui, escolha uma unidade. Ela ganha [Shield 2] neste combate.
// "Uma unidade" sem restrição: qualquer unidade (leitura literal). É alvo escolhido quando o gatilho vai para a pilha,
// não na resolução (ruling FAQ #5071 em app.riftjudge.com).
registerCard({
  code: 'OGN-279',
  triggers: [
    {
      on: 'defend',
      label: 'Dar Shield 2 a uma unidade neste combate',
      // "você" = quem controla o campo (regra 190.6.d): sem controlador, não dispara
      cond: (c, ev) => !!ev.playerLevel && ev.bf === bfIdx(c) && youHere(c, ev.player),
      targets: [{ prompt: 'Fortified Position: qual unidade ganha Shield 2 neste combate?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u) return;
        c.g.giveKw(u, { shield: 2 }, 'combat');
        c.g.say(`${c.g.name(u)} ganha Shield 2 neste combate.`, c.p);
      },
    },
  ],
});
