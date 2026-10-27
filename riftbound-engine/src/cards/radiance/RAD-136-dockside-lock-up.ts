import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

// [Deploy]. "When you play this, banish a unit here. When you hold here, kill this to play the banished card, ignoring
// its cost. (Tokens aren't cards.)"
// - "kill this" é o custo-base do gatilho de hold (383.3.b): pago ao pôr na pilha; o jogador pode recusar (404.2).
// - "ignoring its cost": custo base [0], custos adicionais continuam (356.1.b.1). Quem joga é o controlador desta carta.
// - "the banished card" é a carta banida por ESTE objeto (versão de zona guardada): se ela saiu do banimento, nada.
const banished = (c: Ctx): Obj | undefined => {
  const d = c.self.data;
  if (!d?.banished || d.banV !== c.self.zoneVersion) return undefined;
  const o = c.g.objs[d.banished as string];
  return o && o.zone === 'banish' && o.zoneVersion === d.banishedVer ? o : undefined;
};
registerCard({
  code: 'RAD-136',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'play',
      label: 'Banir uma unidade aqui',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [{ prompt: 'Dockside Lock-Up: banir qual unidade aqui?', filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || u.zone !== 'board') return;
        c.g.banishObj(u);
        const isCard = !u.token && (u.zone as string) === 'banish';
        c.self.data = { ...(c.self.data || {}), banished: isCard ? u.id : undefined, banishedVer: u.zoneVersion, banV: c.self.zoneVersion };
      },
    },
    {
      on: 'hold',
      label: 'Matar-me para jogar a carta banida, ignorando o custo',
      cond: (c, ev) => ev.player === c.p && ev.bf === c.g.bfIndex(c.self) && !!banished(c),
      canPayExtra: (c) => c.self.zone === 'board',
      extraCost: function* (c) {
        const g = c.g;
        const card = banished(c);
        if (c.self.zone !== 'board' || !card) return false;
        if (!(yield* g.yesNo(c.p, `Dockside Lock-Up: pagar o custo (matar Dockside Lock-Up) para jogar ${g.name(card)}, ignorando o custo?`))) return false;
        c.data.card = card.id;
        c.data.cardVer = card.zoneVersion;
        yield* g.killG(c.self);
        return c.self.zone !== 'board';
      },
      resolve: function* (c) {
        const g = c.g;
        const card = g.objs[c.data.card as string];
        if (!card || card.zone !== 'banish' || card.zoneVersion !== c.data.cardVer) return;
        yield* g.playFromEffect(c.p, card, NO_COST);
      },
    },
  ],
});
