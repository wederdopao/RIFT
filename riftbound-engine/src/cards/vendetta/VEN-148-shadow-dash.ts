import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { E } from '../helpers';
// VEN-148 Shadow Dash — "Move an enemy unit to a battlefield where you have units. If you have exactly two units there,
// they each get +1 [Might] this turn." O destino é escolhido ao jogar, junto com o alvo (regra 355.4), e não pode ser o
// local atual da unidade (355.4.a). Na resolução o destino precisa continuar sendo um campo onde você tem unidades; se não
// for, o movimento é ignorado (como Temptation; FAQ riftjudge #1760).
const dests = (c: Ctx, u: Obj) => c.g.bfs.map((_, i) => i).filter((i) => c.g.bfIndex(u) !== i && c.g.unitsAtBf(i, c.p).length > 0);
registerCard({
  code: 'VEN-148',
  flow: E(5, 'any', 'any'),
  spell: {
    label: 'Shadow Dash',
    targets: [{ prompt: 'Shadow Dash: mover qual unidade inimiga?', filter: (c, o) => o.controller !== c.p && dests(c, o).length > 0 }],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      const ds = dests(c, u);
      if (!ds.length) return false;
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Shadow Dash: mover ${g.name(u)} para qual campo onde você tem unidades?`,
        ds.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })),
      );
      c.data[`dest${c.rep}`] = Number(k);
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const i = c.data[`dest${c.rep}`] as number | undefined;
      if (!u || u.zone !== 'board' || i === undefined) return;
      if (!dests(c, u).includes(i)) {
        g.say(`Shadow Dash: ${g.name(u)} não pode ir para ${g.locName({ t: 'bf', i })} (o destino não é mais válido).`);
        return;
      }
      g.moveUnits([u], { t: 'bf', i }, c.p);
      const mine = g.unitsAtBf(i, c.p);
      if (mine.length === 2) for (const m of mine) g.giveMight(m, 1, 'turn');
    },
  },
});
