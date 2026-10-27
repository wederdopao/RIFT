import { registerCard } from '../../engine/script';
// Lenda: quando você joga um spell, se você gastou [4] ou mais, você pode bani-lo. Então, se houver quatro spells banidos
// comigo, ponha cada um no descarte do dono, canalize 4 runas e compre 1.
// - "Quando você joga um spell" dispara quando a jogada termina, na resolução (419.4.a); spell anulado não é jogado e não
//   dispara (RiftJudge #10308, #10730, #12768).
// - "Gastou [4] ou mais": a energia paga de fato pelo spell (custo total, Repeat incluído; desconto conta a menos —
//   RiftJudge #11727, #10862). O motor guarda o que foi pago em o.data.spentE (g.noteSpellEnergy).
// - "Você pode" no começo do efeito: o jogador escolhe se o gatilho vai para a pilha (patch notes do Unleashed). A carta é
//   banida de onde está (o descarte, depois de resolver); se não está mais lá (Flow, reciclada), não há o que banir.
// - "Banidos comigo": os spells que esta lenda baniu e continuam no banimento (o.data.jhinBanished: id + versão).
registerCard({
  code: 'UNL-181',
  triggers: [
    {
      on: 'play',
      label: 'Banir o spell jogado (Virtuoso)',
      optional: 'banir o spell que você acabou de jogar?',
      cond: (c, ev) => !!ev.spell && ev.player === c.p && (ev.obj?.data?.spentE ?? 0) >= 4,
      resolve: function* (c) {
        const g = c.g;
        const card = c.ev!.obj;
        if (card.zone !== 'trash') return g.say(`${g.name(card)} não está mais no descarte: não é banida.`, c.p);
        g.banishObj(card);
        const d = (c.self.data ||= {});
        const list = [...(d.jhinBanished || []), { id: card.id, v: card.zoneVersion }] as { id: string; v: number }[];
        const still = list.filter((x) => g.objs[x.id]?.zone === 'banish' && g.objs[x.id].zoneVersion === x.v);
        d.jhinBanished = still;
        g.say(`Spells banidos com ${g.name(c.self)}: ${still.length}.`, c.p);
        if (still.length < 4) return;
        for (const x of still) g.toZone(g.objs[x.id], 'trash');
        d.jhinBanished = [];
        g.say(`${g.name(c.self)}: os spells banidos com ela vão para o descarte.`, c.p);
        g.channel(c.p, 4);
        yield* g.draw(c.p, 1);
      },
    },
  ],
});
