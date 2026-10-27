import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-137',
  triggers: ['play', 'attack'].map((on) => ({
    on: on as any,
    label: 'Descartar 1 para matar uma unidade ou gear',
    optional: 'Descartar 1 para matar uma unidade ou gear?',
    cond: (c: any, ev: any) => (on === 'play' ? ev.obj?.id === c.self.id : ev.unit?.id === c.self.id),
    canPayExtra: (c: any) => c.g.pl[c.p].hand.length > 0,
    extraCost: function* (c: any) {
      const r = yield* c.g.discard(c.p, 1, 'Mordekaiser: descarte 1');
      return r.length > 0;
    },
    targets: [{ prompt: 'Mordekaiser: matar qual unidade ou gear?', kind: 'permanent' as const }],
    resolve: function* (c: any) {
      const o = c.targets[0][0];
      if (o && o.zone === 'board') yield* c.g.killG(o);
    },
  })),
});
