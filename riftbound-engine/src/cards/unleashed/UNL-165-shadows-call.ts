import { registerCard } from '../../engine/script';

// Escolha uma unidade aliada sem [Temporary]. Dê [Temporary] a ela. Compre 2.
// - Alvo escolhido ao jogar; se na resolução já tiver Temporary (ou não for mais aliada), deixa de ser válida e só o
//   "Compre 2" acontece (instrução independente: 359.3.e.5).
// - O Temporary dado não tem duração: vale enquanto ela estiver no tabuleiro (efeito 'perm', some ao sair; 816.1.b:
//   morre no início da Beginning Phase do controlador, antes de pontuar).
registerCard({
  code: 'UNL-165',
  spell: {
    label: "Shadow's Call",
    targets: [
      {
        prompt: "Shadow's Call: dar Temporary a qual unidade sua (sem Temporary)?",
        filter: (c, o) => o.controller === c.p && !c.g.kw(o).temporary,
      },
    ],
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (u) {
        g.addEffect({ target: u.id, kw: { temporary: true }, until: 'perm' });
        g.say(`${g.name(u)} ganha Temporary.`, c.p);
      }
      yield* g.draw(c.p, 2);
    },
  },
});
