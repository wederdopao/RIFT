import { registerCard } from '../../engine/script';

// [Assault]. Quando eu ataco, cause dano igual ao meu [Assault] a uma unidade inimiga aqui.
// O valor é o Assault total na resolução (com bônus de equipamentos e efeitos, 807.2); se eu tiver saído do tabuleiro,
// vale o último valor conhecido (guardado ao pôr na pilha).
registerCard({
  code: 'SFD-028',
  keywords: { assault: 1 },
  triggers: [
    {
      on: 'attack',
      label: 'Dano igual ao meu Assault numa unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Lucian: dano em qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      choose: function* (c) {
        c.data.lki = c.g.kw(c.self).assault || 0;
        return true;
      },
      resolve: function* (c) {
        const t = c.targets[0][0];
        const n = c.self.zone === 'board' ? c.g.kw(c.self).assault || 0 : c.data.lki || 0;
        if (t && n > 0) c.g.dealDamage(t, n, c.self);
      },
    },
  ],
});
