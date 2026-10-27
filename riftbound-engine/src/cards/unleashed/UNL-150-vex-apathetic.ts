import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Campeã 4, Deflect. Quando um oponente joga uma unidade enquanto estou num campo de batalha, atordoe-a. Ele não pode
// movê-la neste turno.
// - Vale para unidade jogada em qualquer local, inclusive fichas (185.2.a); "enquanto estou num campo" é parte da
//   condição, conferida na jogada (383.2.a.1; RiftJudge #9240, #9751). Não escolhe (não é alvo; RiftJudge #9312).
// - "Ele não pode movê-la": só o oponente fica proibido, e de qualquer movimento (padrão ou por efeito dele; RiftJudge
//   #10548, Bard, Mercurial). Gancho do motor: Obj.noMoveBy + Engine.cantMoveBy.
// - Se a unidade sair do tabuleiro antes de resolver, é outro objeto (124): nada acontece.
registerCard({
  code: 'UNL-150',
  keywords: { deflect: 1 },
  triggers: [
    {
      on: 'play',
      label: 'Atordoar a unidade jogada pelo oponente',
      cond: (c, ev) => !!ev.obj && c.g.isUnit(ev.obj) && ev.player !== c.p && c.g.bfIndex(c.self) >= 0,
      prepare: function* (c) {
        c.data.uid = c.ev!.obj.id;
        c.data.ver = c.ev!.obj.zoneVersion;
        c.data.who = c.ev!.player as P;
        return true;
      },
      resolve: function* (c) {
        const u = c.g.objs[c.data.uid];
        if (!u || u.zone !== 'board' || u.zoneVersion !== c.data.ver) return;
        c.g.stun(u, c.p);
        u.noMoveTurn = c.g.turn;
        u.noMoveBy = c.data.who;
      },
    },
  ],
});
