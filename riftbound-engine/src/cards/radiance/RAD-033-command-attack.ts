import { registerCard } from '../../engine/script';
import { chooseMode } from './_rad';
import type { Obj } from '../../engine/types';

// Escolha um: mova um gear aliado com Deploy para um campo; ou olhe o topo 5, pode revelar um gear e comprá-lo, recicle o resto.
registerCard({
  code: 'RAD-033',
  spell: {
    label: 'Command: Attack',
    prepare: function* (c) {
      const g = c.g;
      const opts: { id: string; label: string }[] = [{ id: 'look', label: 'Olhar o topo 5 e comprar um gear' }];
      if (g.gearOf(c.p).some((o) => g.kw(o).deploy && !o.attachedTo)) opts.unshift({ id: 'move', label: 'Mover um gear seu com Deploy para um campo' });
      const m = yield* chooseMode(c, 'Command: Attack — escolha um', opts);
      if (!m) return false;
      c.data.mode = m;
      return true;
    },
    targets: (c) =>
      c.data.mode === 'move'
        ? [{ prompt: 'Command: Attack: mover qual gear seu com Deploy?', kind: 'gear' as const, filter: (cc, o) => o.controller === cc.p && !!cc.g.kw(o).deploy && !o.attachedTo }]
        : [],
    // o destino do movimento é escolhido ao jogar, junto com o alvo (355.4)
    choose: function* (c, ids) {
      if (c.data.mode !== 'move') return true;
      const g = c.g;
      const gear = g.objs[ids[0]?.[0]];
      if (!gear) return true;
      const cur = g.bfIndex(gear);
      const dests = g.bfs.map((_, i) => i).filter((i) => i !== cur);
      if (!dests.length) return false;
      const [id] = dests.length === 1 ? [String(dests[0])] : yield* g.ask(c.p, 'choose', 'Command: Attack: mover o gear para qual campo?', dests.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
      c.data.dest = Number(id);
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      if (c.data.mode === 'move') {
        const gear = c.targets[0]?.[0];
        const to = c.data.dest as number | undefined;
        if (!gear || gear.zone !== 'board' || to === undefined || g.bfIndex(gear) === to) return;
        gear.loc = { t: 'bf', i: to };
        g.say(`${g.name(gear)} vai para ${g.locName(gear.loc)}.`, c.p);
        return;
      }
      const ids = yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 5));
      const cards = ids.map((id) => g.objs[id]).filter((o) => o.zone === 'mainDeck');
      const gears = cards.filter((o) => g.isGear(o));
      let pick: Obj | undefined;
      if (gears.length) {
        const [id] = yield* g.ask(c.p, 'choose', 'Command: Attack: revelar e comprar qual gear?', [...gears.map((o) => ({ id: o.id, label: g.name(o), obj: o.id })), { id: 'none', label: 'Nenhum' }]);
        if (id !== 'none') pick = g.objs[id];
      }
      if (pick) {
        g.toZone(pick, 'hand');
        g.emit({ type: 'draw', player: c.p, obj: pick });
        g.say(`${g.pname(c.p)} revela e compra ${g.name(pick)}.`, c.p);
      }
      yield* g.recycleCards(cards.filter((o) => o !== pick && o.zone === 'mainDeck'), { by: c.p });
    },
  },
});
