import { registerCard } from '../../engine/script';
// Lenda: [Tap]: [Reaction] — compre 1. Use só se você escolheu unidades e/ou gear inimigos duas vezes neste turno com
// spells ou habilidades de unidades.
// - Conta cada escolha de unidade/gear inimigo: um spell que escolhe duas unidades inimigas já conta duas vezes, e
//   escolher o mesmo alvo em dois spells também (RiftJudge #6758). A cópia do Repeat escolhe de novo e conta
//   (RiftJudge #11465, #9742). As escolhas valem ao pôr na pilha (o spell não precisa resolver).
// - Habilidade de gear não conta (RiftJudge #11425, #11001), nem de lenda ou de campo. O texto de efeito de um
//   equipamento é habilidade da unidade (regra 136.2.c), então conta.
registerCard({
  code: 'SFD-199',
  activated: [
    {
      label: 'Exaurir: comprar 1',
      exhaustSelf: true,
      timing: 'reaction',
      condition: (g, self) =>
        (g.pl[self.controller].chooseLog || [])
          .filter((x) => x.turn === g.turn && (x.src === 'spell' || x.src === 'unit'))
          .reduce((n, x) => n + (x.enemies ?? (x.enemy ? 1 : 0)), 0) >= 2,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
