import { registerCard } from '../../engine/script';
import { newChoices } from '../helpers';

// Reaction: ganhe o controle de um spell. Você pode fazer novas escolhas para ele.
// Novas escolhas (regras 751-755): modos/campos (prepare), alvos (inclusive os de cada execução do Repeat) e destinos
// (choose); o jogador refaz qualquer subconjunto delas (753). Custos que as novas escolhas gerariam (Deflect) são
// ignorados (755) e os novos alvos disparam efeitos de "quando escolhido" (754).
registerCard({
  code: 'OGN-080',
  keywords: { reaction: true },
  spell: {
    label: 'Mystic Reversal',
    targets: [{ prompt: 'Mystic Reversal: ganhar o controle de qual spell?', kind: 'spell' }],
    resolve: function* (c) {
      const g = c.g;
      const s = c.targets[0][0];
      const item = s && g.chain.find((it) => it.cardId === s.id);
      if (!item) return;
      item.playedBy ??= item.controller; // quem jogou continua sendo quem jogou ("quando você joga", 419.4.a)
      item.controller = c.p;
      item.ctx.p = c.p;
      s.controller = c.p;
      g.say(`${g.pname(c.p)} ganha o controle de ${g.name(s)}.`, c.p);
      yield* newChoices(c, item);
    },
  },
});
