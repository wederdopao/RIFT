import { registerCard } from '../../engine/script';
import { T } from '../helpers';
import type { Loc } from '../../engine/types';

// Hidden. Escolha uma unidade aliada, depois escolha um: mova-a para um campo aberto; ou dê-lhe Ganking neste turno
// se não houver campos abertos. O modo (e o destino) é escolhido ao jogar, depois do alvo (355.4).
registerCard({
  code: 'RAD-102',
  keywords: { hidden: true },
  spell: {
    label: 'Demon Shade',
    targets: [T.friendlyUnit('Demon Shade: qual unidade aliada?')],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      const open = g.bfs.map((_, i) => i).filter((i) => g.isOpenBf(i));
      const opts = [
        ...(open.length ? [{ id: 'move', label: 'Mover para um campo aberto' }] : []),
        { id: 'gank', label: 'Dar Ganking neste turno (se não houver campos abertos)' },
      ];
      const [m] = opts.length === 1 ? [opts[0].id] : yield* g.ask(c.p, 'choose', 'Demon Shade: escolha um', opts);
      c.data.mode = m;
      if (m === 'move') {
        const [k] =
          open.length === 1
            ? [String(open[0])]
            : yield* g.ask(c.p, 'choose', 'Demon Shade: mover para qual campo aberto?', open.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
        c.data.dest = { t: 'bf', i: Number(k) } as Loc;
      }
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0]?.[0];
      if (!u || u.zone !== 'board') return;
      if (c.data.mode === 'move') {
        const to = c.data.dest as Loc | undefined;
        if (to && to.t === 'bf' && g.isOpenBf(to.i) && !g.locEq(u.loc, to)) g.moveUnits([u], to, c.p);
      } else if (!g.bfs.some((_, i) => g.isOpenBf(i))) g.giveKw(u, { ganking: true });
    },
  },
});
