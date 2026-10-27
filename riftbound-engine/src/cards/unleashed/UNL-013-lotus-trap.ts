import { registerCard } from '../../engine/script';

// Lotus Trap. Hidden, Reaction. Escolha uma unidade. Dobre todo o dano que seria causado a ela neste turno.
// - Substituição atrasada (efeito 'doubleDamage' no motor, Engine.dealDamage): cada Lotus Trap dobra de novo.
// - No combate a duplicação vale na atribuição: o mínimo letal é o que, dobrado, mata (uma unidade de 3 de Might precisa
//   de 2), e o dano não é dobrado outra vez ao ser causado (465.2.c.4.a, 465.2.c.5 — o exemplo da regra é a Lotus Trap;
//   riftboundfaq.com/cards/lotus-trap).
// - Jogada a partir de Hidden, a unidade tem de estar no campo onde a carta estava escondida (811.1.d.2).
registerCard({
  code: 'UNL-013',
  keywords: { hidden: true, reaction: true },
  spell: {
    label: 'Lotus Trap',
    targets: [{ prompt: 'Lotus Trap: dobrar o dano causado a qual unidade neste turno?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      c.g.addEffect({ target: u.id, player: c.p, until: 'turn', flag: 'doubleDamage' });
      c.g.say(`Todo o dano causado a ${c.g.name(u)} neste turno será dobrado.`, c.p);
    },
  },
});
