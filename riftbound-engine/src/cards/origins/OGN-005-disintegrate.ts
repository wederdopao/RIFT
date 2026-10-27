import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Action: cause 3 a uma unidade num campo. Se isto a matar, faça isto: compre 1.
// "Faça isto" é um gatilho reflexivo (regra 387) que usa a pilha. A morte por dano letal acontece na limpeza logo
// depois da resolução e é atribuída a este spell (regra 428.5.c); o gatilho olha exatamente esse item da pilha.
registerCard({
  code: 'OGN-005',
  keywords: { action: true },
  spell: {
    label: 'Disintegrate',
    targets: [{ prompt: 'Disintegrate: 3 de dano em qual unidade num campo?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      const spell = c.self;
      const g = c.g;
      const itemId = c.item?.id;
      g.addDelayed({
        controller: c.p,
        sourceId: spell.id,
        on: 'die',
        once: true,
        untilTurn: g.turn,
        cond: (_cc, ev) => ev.obj?.id === u.id && !!itemId && ev.killedBy?.item === itemId,
        ability: {
          label: 'Disintegrate matou: comprar 1',
          resolve: function* (cc) {
            yield* cc.g.draw(cc.p, 1);
          },
        },
      });
      g.dealDamage(u, 3, spell);
    },
  },
});
