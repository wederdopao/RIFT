import { registerCard } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';

// Gear. No início da sua Beginning Phase, se você tem exatamente 4 cartas na mão e exatamente 4 unidades em campos de
// batalha, você vence a partida.
// - O "se" logo depois da condição faz parte da condição do gatilho: checado quando dispara, não de novo ao resolver
//   (383.2.a.1, exemplo da Sona; mesmo critério da The Grand Plaza). "Unidades" = as suas.
// Descarte 1, [Tap]: jogue uma ficha Bird de 1 de Might com [Deflect].
// - Habilidade sem [Action]/[Reaction]: só na fase principal do seu turno. Sem local no texto: a ficha vai para a sua
//   base ou um campo que você controla (355.2.a), à sua escolha.
registerCard({
  code: 'UNL-088',
  triggers: [
    {
      on: 'beginStart',
      label: 'Vencer com exatamente 4 cartas na mão e 4 unidades em campos',
      cond: (c, ev) =>
        ev.player === c.p &&
        c.g.pl[c.p].hand.length === 4 &&
        c.g.units().filter((u) => u.controller === c.p && c.g.bfIndex(u) >= 0).length === 4,
      resolve: function* (c) {
        const g = c.g;
        if (g.winner !== null) return;
        g.winner = c.p;
        g.winReason = 'Gutter Palace';
        g.say(`🏆 ${g.pname(c.p)} tem 4 cartas na mão e 4 unidades em campos: Gutter Palace vence a partida!`, c.p);
      },
    },
  ],
  activated: [
    {
      label: 'Descartar 1, exaurir: ficha Bird com [Deflect]',
      exhaustSelf: true,
      canPayExtra: (c) => c.g.pl[c.p].hand.length > 0,
      extraCost: function* (c) {
        const d = yield* c.g.discard(c.p, 1, 'Gutter Palace: descarte 1 (custo)');
        return d.length === 1;
      },
      resolve: function* (c) {
        const loc = yield* chooseTokenLoc(c, 'Gutter Palace: onde jogar a ficha Bird?');
        if (loc) yield* c.g.playTokenG('TOK-BIRD', c.p, loc);
      },
    },
  ],
});
