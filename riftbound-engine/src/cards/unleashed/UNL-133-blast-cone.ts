import { registerCard } from '../../engine/script';
import { moveDestinations } from '../helpers';
import type { Loc } from '../../engine/types';

// Gear. Quando você joga isto, você pode mover uma unidade inimiga. Quando você move uma unidade inimiga, você pode
// exaurir isto para atordoá-la (Stun).
// - 1ª habilidade: "you may" no início do efeito = escolher ao pôr na pilha se o gatilho acontece (383.3.a). A unidade é
//   alvo e o destino (qualquer local válido diferente do atual) é escolhido nessa hora (355.4, 355.5.b).
// - 2ª habilidade: dispara a cada unidade inimiga que VOCÊ move (por qualquer efeito seu, inclusive a 1ª habilidade).
//   "you may exhaust this to Stun it" = "you may" + custo dentro das instruções: exaurir é o custo do gatilho, pago ao
//   pô-lo na pilha (383.3.a, 383.3.b; patch notes do Unleashed). Já exaurido, não dá para pagar e não vai para a pilha.
//   "it" é a unidade movida (não é escolha); se ela sair do tabuleiro antes, nada acontece.
registerCard({
  code: 'UNL-133',
  onPlay: [
    {
      label: 'Mover uma unidade inimiga',
      optional: 'Mover uma unidade inimiga?',
      targets: [{ prompt: 'Blast Cone: mover qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
      choose: function* (c, ids) {
        const g = c.g;
        const u = g.objs[ids[0]?.[0]];
        if (!u) return false;
        const dests = moveDestinations(c, u).filter((l) => !g.moveBlocked(u, u.loc!, l));
        if (!dests.length) return false;
        const [k] = yield* g.ask(c.p, 'choose', `Blast Cone: mover ${g.name(u)} para onde?`, dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })));
        c.data.dest = dests[Number(k)];
        return true;
      },
      resolve: function* (c) {
        const u = c.targets[0][0];
        const to = c.data.dest as Loc | undefined;
        if (u && to && u.zone === 'board') c.g.moveUnits([u], to, c.p);
      },
    },
  ],
  triggers: [
    {
      on: 'move',
      label: 'Exaurir para atordoar a unidade inimiga movida',
      optional: 'Exaurir Blast Cone para atordoar a unidade inimiga que você moveu?',
      cond: (c, ev) => ev.mover === c.p && !!ev.unit && ev.unit.controller !== c.p && !c.self.exhausted,
      prepare: function* (c) {
        c.data.uid = c.ev!.unit.id;
        c.data.ver = c.ev!.unit.zoneVersion;
        return true;
      },
      extraCost: function* (c) {
        if (c.self.exhausted || c.self.zone !== 'board') return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        const u = c.g.objs[c.data.uid];
        if (u && u.zone === 'board' && u.zoneVersion === c.data.ver) c.g.stun(u, c.p);
      },
    },
  ],
});
