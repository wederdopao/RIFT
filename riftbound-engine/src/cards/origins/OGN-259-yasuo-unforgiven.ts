import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Loc, Obj } from '../../engine/types';
import { E } from '../helpers';
// Lenda: [2], [Tap]: mova uma unidade aliada para a base dela ou da base dela para um campo de batalha.
// Regra 355.4: o destino é escolhido ao ativar, logo depois do alvo (gancho `choose`).
const friendly = (c: Ctx, o: Obj) => o.controller === c.p;

registerCard({
  code: 'OGN-259',
  activated: [
    {
      label: '[2], exaurir: mover uma unidade sua de/para a base',
      exhaustSelf: true,
      cost: E(2),
      targets: [{ prompt: 'Yasuo: mover qual unidade sua?', filter: friendly }],
      choose: function* (c, ids) {
        const g = c.g;
        const u = g.objs[ids[0]?.[0]];
        if (!u) return true;
        let dest: Loc = { t: 'base', p: u.controller };
        if (u.loc?.t === 'base') {
          const [k] = yield* g.ask(
            c.p,
            'choose',
            `Mover ${g.name(u)} para qual campo?`,
            g.bfs.map((b, i) => ({ id: String(i), label: g.name(b.objId), obj: b.objId })),
          );
          dest = { t: 'bf', i: Number(k) };
        }
        c.data[`dest${c.rep}`] = dest;
        return true;
      },
      resolve: function* (c) {
        const u = c.targets[0][0];
        const dest: Loc | undefined = c.data[`dest${c.rep}`];
        if (!u || u.zone !== 'board' || !dest) return;
        // o movimento precisa continuar sendo "para a base" ou "da base" (se a unidade mudou de lugar, é ignorado)
        if (dest.t === 'bf' && u.loc?.t !== 'base') return;
        if (dest.t === 'base' && u.loc?.t !== 'bf') return;
        c.g.moveUnits([u], dest, c.p);
      },
    },
  ],
});
