import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Obj } from '../../engine/types';

// [1][Order], exaurir: mate uma unidade aliada. Olhe as 5 cartas do topo do seu Main Deck. Você pode banir dentre
// elas uma unidade com Might até 1 a mais que a unidade morta e jogá-la, ignorando o custo. Depois recicle o resto.
registerCard({
  code: 'OGN-242',
  activated: [
    {
      label: '[1][Order], exaurir: matar unidade sua e buscar no topo do deck',
      exhaustSelf: true,
      cost: E(1, 'Order'),
      alwaysResolve: true,
      targets: [{ prompt: 'Baited Hook: matar qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0]?.[0];
        // se a unidade saiu do tabuleiro, o Might dela é "nulo": revela o topo mas não joga nada
        let limit: number | null = null;
        if (u && u.zone === 'board') {
          limit = Math.max(0, g.might(u)) + 1;
          yield* g.killG(u);
        }
        // olhar o topo (Nocturne, Horrifying pode ser banida ao ser olhada)
        const top = (yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 5))).map((id) => g.objs[id]);
        if (!top.length) return;
        g.say(`Baited Hook revela: ${top.map((o) => g.name(o)).join(', ')}.`, c.p);
        const cands = limit === null ? [] : top.filter((o) => g.isUnit(o) && g.data(o).might <= limit!);
        let pick: Obj | undefined;
        if (cands.length) [pick] = yield* g.chooseObj(c.p, `Baited Hook: banir e jogar qual unidade (Might até ${limit})? (opcional)`, cands, 0, 1);
        if (pick) {
          g.banishObj(pick);
          // "ignorando o custo": custo base 0; custos adicionais (Accelerate) ainda podem ser pagos (356.1.b.3)
          yield* g.playFromEffect(c.p, pick, E(0));
        }
        // "Depois recicle o resto": várias cartas ao mesmo tempo vão para o fundo em ordem aleatória (416.5)
        yield* g.recycleCards(top.filter((o) => o !== pick && o.zone === 'mainDeck'));
      },
    },
  ],
});
