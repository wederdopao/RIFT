import { registerCard } from '../../engine/script';

// Quando uma unidade aliada morre, você pode me exaurir para comprar 1 e depois pôr uma carta da sua mão no topo ou no
// fundo do seu deck principal.
// - "Você pode me exaurir para": custo do gatilho logo depois do "você pode", decidido e pago ao pôr na pilha
//   (383.3.a e 383.3.b). Exaurido, não dá para usar (RiftJudge #8748). Cada Altar dispara separado.
// - Fichas de unidade também contam (FAQ #8869); morte substituída (Soraka, Sett) não é morte (FAQ #11835).
// - A carta da mão não é alvo (a mão não é pública, 355.10.a): escolhida na resolução, junto com topo ou fundo.
registerCard({
  code: 'SFD-169',
  triggers: [
    {
      on: 'die',
      label: 'Exaurir para comprar 1 e devolver uma carta ao deck',
      optional: 'Exaurir o Altar of Memories para comprar 1 e pôr uma carta da mão no topo ou no fundo do deck?',
      cond: (c, ev) => !!ev.obj && c.g.isUnit(ev.obj) && ev.controller === c.p && !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.zone !== 'board' || c.self.exhausted) return false;
        c.g.exhaust(c.self);
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        yield* g.draw(c.p, 1);
        const hand = g.pl[c.p].hand.map((id) => g.objs[id]);
        if (!hand.length) return;
        const [card] = yield* g.chooseObj(c.p, 'Altar of Memories: qual carta da mão vai para o deck?', hand);
        const [where] = yield* g.ask(c.p, 'choose', `Pôr ${g.name(card)} no topo ou no fundo do deck?`, [
          { id: 'top', label: 'Topo do deck' },
          { id: 'bottom', label: 'Fundo do deck' },
        ]);
        g.toZone(card, 'mainDeck', { bottom: where === 'bottom' });
        g.say(`${g.pname(c.p)} põe uma carta da mão no ${where === 'bottom' ? 'fundo' : 'topo'} do deck.`, c.p);
      },
    },
  ],
});
