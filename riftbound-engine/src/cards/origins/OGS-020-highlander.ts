import { registerCard } from '../../engine/script';
// Reaction. Escolha uma unidade aliada. Da próxima vez que ela fosse morrer neste turno, cure-a, exaura-a e
// chame-a de volta para a base (não é movimento) em vez disso.
registerCard({
  code: 'OGS-020',
  keywords: { reaction: true },
  spell: {
    label: 'Highlander',
    targets: [{ prompt: 'Highlander: proteger qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.addEffect({ target: u.id, flag: 'retreat', until: 'turn' });
      c.g.say(`${c.g.name(u)} está protegida da próxima morte neste turno.`, c.p);
    },
  },
});
