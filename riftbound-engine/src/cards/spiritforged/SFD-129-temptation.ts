import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Ctx } from '../../engine/script';
import type { Loc, Obj } from '../../engine/types';

// Repeat [2]. Mova uma unidade inimiga para um local onde há uma unidade com o mesmo controlador.
// O destino é escolhido ao jogar, junto com o alvo (regra 355.4; FAQ riftjudge #1760: a escolha não muda depois).
// Locais válidos: diferentes do local atual (355.4.a) e com outra unidade do mesmo controlador (a base dele ou um
// campo). Na resolução o destino precisa continuar assim; se não estiver (ou se a unidade já estiver lá), a instrução
// não pode ser seguida e é ignorada (359.3.e.6; FAQ #1760).
function dests(c: Ctx, u: Obj): Loc[] {
  const g = c.g;
  const out: Loc[] = [];
  const has = (l: Loc) => g.units().some((x) => x.id !== u.id && x.controller === u.controller && g.locEq(x.loc, l));
  const base: Loc = { t: 'base', p: u.controller };
  if (!g.locEq(u.loc, base) && has(base)) out.push(base);
  g.bfs.forEach((_, i) => {
    const l: Loc = { t: 'bf', i };
    if (!g.locEq(u.loc, l) && has(l)) out.push(l);
  });
  return out;
}

registerCard({
  code: 'SFD-129',
  repeat: E(2),
  spell: {
    label: 'Temptation',
    targets: [
      {
        prompt: 'Temptation: mover qual unidade inimiga?',
        filter: (c, o) => o.controller !== c.p && dests(c, o).length > 0,
      },
    ],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      const ds = dests(c, u);
      if (!ds.length) return false;
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Temptation: mover ${g.name(u)} para onde?`,
        ds.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      c.data[`dest${c.rep}`] = ds[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const to = c.data[`dest${c.rep}`] as Loc | undefined;
      if (!u || !to) return;
      if (!dests(c, u).some((l) => g.locEq(l, to))) {
        g.say(`Temptation: ${g.name(u)} não pode ir para ${g.locName(to)} (o destino não é mais válido).`);
        return;
      }
      g.moveUnits([u], to, c.p);
    },
  },
});
