import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Ctx } from '../../engine/script';

// Action. Repeat [Caos]. Olhe as 2 cartas do topo do deck principal. Compre uma e recicle a outra.
// "Compre uma" é comprar (regra 413.1: comprar tira uma carta de uma zona e põe na mão; dispara "quando você
// compra"). Olhar o topo passa por lookAtTop (Nocturne). Com 1 carta só no deck, compra essa.
// Repeat: a segunda execução olha o novo topo.
function* calledShot(c: Ctx) {
  const g = c.g;
  const top = yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 2));
  if (!top.length) return;
  const [id] = yield* g.ask(
    c.p,
    'choose',
    'Called Shot: qual carta comprar? (a outra é reciclada)',
    top.map((x) => ({ id: x, label: g.name(x), obj: x })),
  );
  const pick = g.objs[id];
  if (pick.zone === 'mainDeck') {
    g.toZone(pick, 'hand');
    g.emit({ type: 'draw', player: c.p, obj: pick });
    g.say(`${g.pname(c.p)} compra 1 (Called Shot).`, c.p);
  }
  yield* g.recycleCards(top.filter((x) => x !== id && g.objs[x].zone === 'mainDeck').map((x) => g.objs[x]), { by: c.p });
}

registerCard({
  code: 'SFD-122',
  keywords: { action: true },
  repeat: E(0, 'Chaos'),
  spell: {
    label: 'Called Shot',
    resolve: calledShot,
  },
});
