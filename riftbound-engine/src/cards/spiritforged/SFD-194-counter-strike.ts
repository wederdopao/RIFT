import { registerCard } from '../../engine/script';
// Reaction. Escolha uma unidade. Da próxima vez que ela fosse receber dano neste turno, previna-o. Compre 1.
// Previne todo o dano daquela vez (com o Bonus Damage, regra 437.1.a.1); no combate, nenhuma quantidade é letal para
// ela na atribuição (437.5.b). O "compre 1" acontece mesmo se a unidade deixar de ser alvo válido (359.3.e.6).
registerCard({
  code: 'SFD-194',
  keywords: { reaction: true },
  spell: {
    label: 'Counter Strike',
    targets: [{ prompt: 'Counter Strike: qual unidade?' }],
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0]?.[0];
      if (u && u.zone === 'board') {
        g.addEffect({ target: u.id, until: 'turn', flag: 'preventNextDamage' });
        g.say(`O próximo dano em ${g.name(u)} neste turno será prevenido.`, c.p);
      }
      yield* g.draw(c.p, 1);
    },
  },
});
