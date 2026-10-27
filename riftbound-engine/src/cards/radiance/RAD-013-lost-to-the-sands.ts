import { registerCard } from '../../engine/script';
import { T } from '../helpers';
import { chooseMode } from './_rad';

// Action. Escolha um: cause 4 a uma unidade num campo; ou mate um gear.
registerCard({
  code: 'RAD-013',
  keywords: { action: true },
  spell: {
    label: 'Lost to the Sands',
    prepare: function* (c) {
      const g = c.g;
      const opts: { id: string; label: string }[] = [];
      if (g.units().some((u) => g.bfIndex(u) >= 0)) opts.push({ id: 'dmg', label: 'Causar 4 de dano a uma unidade num campo' });
      if (g.board().some((o) => g.isGear(o))) opts.push({ id: 'gear', label: 'Matar um gear' });
      const m = yield* chooseMode(c, 'Lost to the Sands: escolha um', opts);
      if (!m) return false;
      c.data.mode = m;
      return true;
    },
    targets: (c) =>
      c.data.mode === 'gear'
        ? [{ prompt: 'Lost to the Sands: matar qual gear?', kind: 'gear' as const }]
        : c.data.mode === 'dmg'
          ? [T.unitAtBf('Lost to the Sands: 4 de dano em qual unidade num campo?')]
          : [],
    resolve: function* (c) {
      const t = c.targets[0]?.[0];
      if (!t) return;
      if (c.data.mode === 'gear') yield* c.g.killG(t);
      else c.g.dealDamage(t, 4, c.self);
    },
  },
});
