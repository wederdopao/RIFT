import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Lenda: [1], [Tap]: devolva uma unidade aliada num campo à mão do dono. Jogue uma ficha de gear Gold exaurida.
// - Sem [Reaction]: só no seu turno, com a pilha vazia e fora de showdown. A unidade é alvo (ao ativar).
// - As duas instruções são independentes: se a unidade deixar de ser alvo válido, a Gold ainda é jogada (359.3.e.5-6).
// - Gear sem local vai para a base de quem o joga.
registerCard({
  code: 'UNL-185',
  activated: [
    {
      label: '[1], exaurir: devolver uma unidade aliada num campo à mão e jogar uma Gold exaurida',
      exhaustSelf: true,
      cost: E(1),
      alwaysResolve: true,
      targets: [{ prompt: 'Pyke: devolver qual unidade aliada num campo à mão do dono?', filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) >= 0 }],
      resolve: function* (c) {
        const u = c.targets[0]?.[0];
        if (u) c.g.returnToHand(u);
        yield* c.g.playTokenG('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
