import { registerCard } from '../../engine/script';
import { E, moveDestinations } from '../helpers';
import type { Loc } from '../../engine/types';
// VEN-140 Shuriken Flip
// "Deal 2 to up to one enemy unit at a battlefield, then move a friendly unit." — a unidade aliada também é alvo e o
// destino do movimento é escolhido ao jogar, junto com os alvos (355.4, 355.10), não na resolução.
registerCard({
  code: 'VEN-140',
  flow: E(3, 'any'),
  spell: {
    label: 'Shuriken Flip',
    targets: [
      { prompt: '2 de dano em qual unidade inimiga num campo? (até 1)', min: 0, max: 1, filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 },
      // só unidades com algum destino válido (355.4.a)
      { prompt: 'Shuriken Flip: mover qual unidade aliada?', filter: (c, o) => o.controller === c.p && moveDestinations(c, o).length > 0 },
    ],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[1]?.[0]];
      if (!u) return false;
      const dests = moveDestinations(c, u);
      if (!dests.length) return false;
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Shuriken Flip: mover ${g.name(u)} para onde?`,
        dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      c.data[`dest${c.rep}`] = dests[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const t = c.targets[0]?.[0];
      if (t) g.dealDamage(t, 2, c.self);
      const u = c.targets[1]?.[0];
      const to = c.data[`dest${c.rep}`] as Loc | undefined;
      if (!u || !to || u.zone !== 'board') return;
      g.moveUnits([u], to.t === 'base' ? { t: 'base', p: u.controller } : to, c.p);
    },
  },
});
