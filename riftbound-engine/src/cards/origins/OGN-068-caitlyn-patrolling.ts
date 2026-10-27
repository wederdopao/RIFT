import { registerCard } from '../../engine/script';

// Devo receber dano de combate por último. [Tap]: cause dano igual ao meu Might a uma unidade num campo.
// Só enquanto estou num campo.
registerCard({
  code: 'OGN-068',
  // "devo receber dano de combate por último": mesma atribuição do Backline, mas ela não tem a palavra-chave
  damageLast: () => true,
  activated: [
    {
      label: 'Exaurir: dano igual ao meu Might numa unidade num campo',
      exhaustSelf: true,
      condition: (g, self) => g.bfIndex(self) >= 0,
      targets: [{ prompt: 'Caitlyn: causar dano em qual unidade?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        // fora do tabuleiro o Might dela é nulo e o dano não acontece (regra 359.3.e.12)
        if (u && c.self.zone === 'board') c.g.dealDamage(u, c.g.might(c.self), c.self);
      },
    },
  ],
});
