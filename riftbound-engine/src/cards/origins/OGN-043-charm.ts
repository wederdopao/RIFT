import { registerCard } from '../../engine/script';
import { moveDestinations } from '../helpers';
import type { Loc } from '../../engine/types';
// Mova uma unidade inimiga. O destino é escolhido ao jogar, junto com o alvo (regra 355.4); Mystic Reversal pode
// refazer essa escolha (regra 752.1).
registerCard({
  code: 'OGN-043',
  spell: {
    label: 'Charm',
    targets: [
      {
        prompt: 'Charm: mover qual unidade inimiga?',
        // só unidades com algum destino válido (regras 355.4.a e 355.16)
        filter: (c, o) => o.controller !== c.p && moveDestinations(c, o).length > 0,
      },
    ],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      // destino impedido por restrição de movimento (Vilemaw's Lair) continua válido: na resolução a instrução
      // de mover é ignorada (exemplo da regra 359.3.e.6)
      const dests = moveDestinations(c, u);
      if (!dests.length) return false;
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Charm: mover ${g.name(u)} para onde?`,
        dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      c.data[`dest${c.rep}`] = dests[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const u = c.targets[0][0];
      const to = c.data[`dest${c.rep}`] as Loc | undefined;
      if (!u || !to) return;
      // destino de base: a base do controlador atual (a unidade só pode estar na base de quem a controla)
      const dest: Loc = to.t === 'base' ? { t: 'base', p: u.controller } : to;
      c.g.moveUnits([u], dest, c.p);
    },
  },
});
