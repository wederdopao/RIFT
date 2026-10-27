import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';

// "Once each turn, while I'm at a battlefield, you may pay [1][Rune] less to play a gear."
// Desconto de [1] e de um pip de power (Aura.cardCostMod) no custo total do gear; usado = marcado ao pagar (Aura.onPaid).
const can = (g: Engine, src: Obj, card: Obj, p: P) =>
  src.zone === 'board' && p === src.controller && g.bfIndex(src) >= 0 && g.kind(card) === 'gear' && src.data?.oriTurn !== g.turn;
registerCard({
  code: 'RAD-068',
  auras: [
    {
      cardCostMod: (g, src, card, p) => (can(g, src, card, p) ? { energyLess: 1, powerLess: 1 } : undefined),
      onPaid: (g, src, card, p) => {
        if (can(g, src, card, p)) src.data = { ...(src.data || {}), oriTurn: g.turn };
      },
    },
  ],
});
