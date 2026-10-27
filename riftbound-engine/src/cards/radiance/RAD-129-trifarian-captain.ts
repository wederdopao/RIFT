import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// "When you play me, look at the top 4 cards of your Main Deck. You may reveal from among them a unit or gear with Energy
// cost no more than [3] and with Power cost no more than [Rune] and draw it. Recycle the rest."
// Olhar não é revelar: as 4 passam por lookAtTop (Nocturne); só a escolhida é revelada (Void Hatchling antes, "As I'm
// revealed" dela) e comprada (evento 'draw'). Mesmo padrão de Ornn, Blacksmith (SFD-058).
registerCard({
  code: 'RAD-129',
  triggers: [
    {
      on: 'play',
      label: 'Olhar os 4 do topo: pegar uma unidade ou gear barato',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const top = (yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 4))).map((id) => g.objs[id]);
        if (!top.length) return;
        const ok = top.filter((o) => (g.isUnit(o) || g.isGear(o)) && g.data(o).energy <= 3 && g.data(o).power <= 1);
        let pick: Obj | undefined;
        if (ok.length) [pick] = yield* g.chooseObj(c.p, 'Trifarian Captain: revelar e comprar qual carta? (opcional)', ok, 0, 1);
        const gone = new Set<Obj>();
        if (pick) {
          const before = g.pl[c.p].mainDeck[0];
          yield* g.beforeReveal(c.p, c.p);
          if (g.pl[c.p].mainDeck[0] !== before && before) gone.add(g.objs[before]);
          if (!gone.has(pick)) yield* g.onRevealG([pick], c.p);
        }
        if (pick && pick.zone === 'mainDeck' && !gone.has(pick)) {
          g.say(`${g.pname(c.p)} revela ${g.name(pick)} e compra.`, c.p);
          g.toZone(pick, 'hand');
          g.emit({ type: 'draw', player: c.p, obj: pick });
        }
        yield* g.recycleCards(top.filter((o) => o !== pick && !gone.has(o) && o.zone === 'mainDeck'), { by: c.p });
      },
    },
  ],
});
