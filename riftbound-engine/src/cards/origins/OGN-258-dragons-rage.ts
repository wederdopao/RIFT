import { registerCard } from '../../engine/script';
import type { AbilityDef, Ctx } from '../../engine/script';
import type { Loc, Obj } from '../../engine/types';
import { moveDestinations } from '../helpers';
// Mova uma unidade inimiga. Depois faça isto: escolha outra unidade inimiga no destino dela.
// As duas causam uma à outra dano igual aos seus Mights.
// Regra 355.4: o destino do movimento é escolhido ao jogar, logo depois do alvo (gancho `choose`).
// "Then do this" (errata de 28/10/2025) é um gatilho reflexivo (regra 387): o segundo alvo é escolhido quando ele
// vai para a pilha, depois do movimento. O dano é causado pelas unidades (regra 417.6.b.3): sem Bonus Damage.
const enemyFilter = (c: Ctx, o: Obj) => o.controller !== c.p;

registerCard({
  code: 'OGN-258',
  spell: {
    label: "Dragon's Rage",
    targets: [{ prompt: "Dragon's Rage: mover qual unidade inimiga?", filter: (c, o) => enemyFilter(c, o) }],
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      // movimentos impedidos (Vilemaw's Lair) continuam sendo destinos válidos; a instrução é ignorada na resolução
      // (regra 359.3.e.6)
      const dests = moveDestinations(c, u);
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Dragon's Rage: mover ${g.name(u)} para onde?`,
        dests.map((l, j) => ({ id: String(j), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      c.data[`dest${c.rep}`] = dests[Number(k)];
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const u: Obj | undefined = c.targets[0][0];
      const dest: Loc | undefined = c.data[`dest${c.rep}`];
      if (!u || u.zone !== 'board' || !dest) return;
      g.moveUnits([u], dest, c.p); // movimento impedido (Vilemaw's Lair) é ignorado (regra 359.3.e.6)
      const ver = u.zoneVersion;
      const reflex: AbilityDef = {
        label: 'trocar dano entre as duas unidades',
        targets: [
          {
            prompt: "Dragon's Rage: escolha outra unidade inimiga no destino",
            filter: (cc, o) => o.controller !== cc.p && o.id !== u.id && cc.g.locEq(o.loc, dest),
          },
        ],
        resolve: function* (cc) {
          const o = cc.targets[0][0];
          if (!o) return;
          // unidade fora do tabuleiro tem Might nulo: os cálculos com ela são ignorados (regra 359.3.e.12)
          if (u.zone !== 'board' || u.zoneVersion !== ver) return;
          const mu = Math.max(0, cc.g.might(u));
          const mo = Math.max(0, cc.g.might(o));
          cc.g.dealDamage(o, mu, u, { byUnit: true });
          cc.g.dealDamage(u, mo, o, { byUnit: true });
        },
      };
      g.pending.push({ controller: c.p, sourceId: c.self.id, ability: reflex, ev: { type: 'move' }, label: reflex.label, reflexive: true });
    },
  },
});
