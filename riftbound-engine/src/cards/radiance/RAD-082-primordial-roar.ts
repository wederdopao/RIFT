import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-082',
  asPlayed: showOff((g, o) => g.isUnit(o), 'Show Off uma unidade'),
  spell: {
    label: 'Primordial Roar',
    targets: [{ prompt: 'Primordial Roar: dano em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      const info = showedOff(c);
      if (!u || u.zone !== 'board' || !info) return;
      // "that unit's Might" é lido na resolução: unidade aliada apontada = Might atual; se ela saiu do tabuleiro, a
      // informação é nula e não há dano (359.3.e.12). Revelada da mão: o Might da carta revelada.
      let m: number | null = info.might;
      if (!info.fromHand && info.id) {
        const o = c.g.objs[info.id];
        m = o && o.zone === 'board' && o.zoneVersion === info.ver ? c.g.might(o) : null;
      }
      if (m !== null && m > 0) c.g.dealDamage(u, m, c.self);
    },
  },
});
