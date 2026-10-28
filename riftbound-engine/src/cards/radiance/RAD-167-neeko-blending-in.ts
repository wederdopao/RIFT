import { registerCard } from '../../engine/script';
// RAD-167 Neeko, Blending In
// "If Neeko is in your deck, choose up to 3 different legends in addition to your starting legend." (errata de 09/10/2026,
// Radiance Errata Updates: de 0 a 3) — DeckList.extraLegends (deckcheck, deckbuilder, código de deck). Lenda já na Legend
// Zone não pode ser escolhida de novo (extraLegendsOut). "When you play me, choose one of those legends and add it to your Legend Zone
// while I'm on the board." — g.addLegendWhile: as habilidades dela ficam ativas como as da lenda inicial; sai quando
// Neeko sai do tabuleiro.
registerCard({
  code: 'RAD-167',
  onPlay: [
    {
      label: 'Neeko: pôr uma das lendas escolhidas na Legend Zone',
      resolve: function* (c) {
        const g = c.g;
        const out = g.extraLegendsOut(c.p);
        if (!out.length || c.self.zone !== 'board') return;
        const [id] = yield* g.ask(c.p, 'choose', 'Neeko: qual lenda vai para a sua Legend Zone enquanto ela estiver no tabuleiro?', out.map((o) => ({ id: o.id, label: g.name(o), obj: o.id })));
        const leg = g.objs[id];
        if (leg) g.addLegendWhile(c.p, leg, c.self);
      },
    },
  ],
});
