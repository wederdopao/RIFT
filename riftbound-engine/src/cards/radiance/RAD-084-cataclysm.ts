import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

// Oponentes não podem jogar spells neste turno. Mova uma unidade aliada para um campo inimigo ocupado.
// A unidade e o campo são escolhidos ao jogar (355.4); a primeira frase vale mesmo que o movimento não aconteça.
// "Occupied enemy battlefield" = controlado por um oponente e com unidade presente (170.11.a).
registerCard({
  code: 'RAD-084',
  spell: {
    label: 'Cataclysm',
    alwaysResolve: true,
    targets: [{ prompt: 'Cataclysm: mover qual unidade aliada?', filter: (c, o) => o.controller === c.p && o.loc != null }],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      const dests = g.bfs.map((_, i) => i).filter((i) => g.bfs[i].controller === ((1 - c.p) as any) && g.unitsAtBf(i).length > 0 && !(u.loc?.t === 'bf' && u.loc.i === i));
      if (!dests.length) return true;
      const [id] = dests.length === 1 ? [String(dests[0])] : yield* g.ask(c.p, 'choose', 'Cataclysm: mover para qual campo ocupado?', dests.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
      c.data.dest = Number(id);
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      g.addEffect({ player: (1 - c.p) as any, flag: 'cantPlaySpells', until: 'turn' });
      const u = c.targets[0]?.[0];
      const to = c.data.dest as number | undefined;
      if (!u || u.zone !== 'board' || to === undefined) return;
      if (u.loc?.t === 'bf' && u.loc.i === to) return;
      // o campo é restrição do destino, não alvo: se na resolução não é mais um campo inimigo ocupado (170.11.a: com
      // unidade presente), a unidade não se move (riftboundfaq.com/cards/cataclysm; "inimigo" conferido na execução, 359.3.f.4)
      if (g.bfs[to]?.controller !== ((1 - c.p) as any) || g.unitsAtBf(to).length === 0) return;
      g.moveUnits([u], { t: 'bf', i: to }, c.p);
    },
  },
});
