import { registerCard } from '../../engine/script';

// Smite. Action. Cause 3 de dano a uma unidade num campo de batalha. Se ela fosse morrer neste turno, bana-a em vez disso.
// - A segunda frase é uma substituição de morte que dura o turno (369.1; efeito 'banishInstead' no motor): vale para
//   qualquer morte da unidade neste turno, não só pelo dano do Smite. Banida não morre: sem Deathknell (RiftJudge #9664).
// - Com outra substituição para a mesma morte (Zhonya's Hourglass, Guardian Angel), quem controla a unidade escolhe a
//   ordem (372; riftboundfaq.com/cards/smite; RiftJudge #12738).
// - Vale mesmo se o dano for prevenido: prevenir é substituição e não faz a instrução seguinte ser ignorada.
registerCard({
  code: 'UNL-007',
  keywords: { action: true },
  spell: {
    label: 'Smite',
    targets: [{ prompt: 'Smite: 3 de dano em qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      g.dealDamage(u, 3, c.self);
      if (u.zone === 'board') g.addEffect({ target: u.id, player: c.p, until: 'turn', flag: 'banishInstead' });
    },
  },
});
