import { registerCard } from '../../engine/script';
import { moveDestinations, E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-098',
  keywords: { reaction: true },
  spell: {
    label: "Siren's Song",
    targets: [{ prompt: "Siren's Song: mover qual unidade inimiga que se moveu neste turno?", filter: (c, o) => o.controller !== c.p && c.g.movesThisTurn(o) > 0 }],
    // o destino do movimento é escolhido ao jogar, junto com o alvo (355.4)
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      const dests = moveDestinations(c, u);
      if (!dests.length) return true;
      const [k] = yield* g.ask(c.p, 'choose', `Siren's Song: mover ${g.name(u)} para onde?`, dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })));
      c.data.dest = dests[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const u = c.targets[0][0];
      const dest = c.data.dest;
      if (!u || u.zone !== 'board' || !dest || c.g.locEq(u.loc, dest)) return;
      c.g.moveUnits([u], dest, c.p);
    },
  },
});
