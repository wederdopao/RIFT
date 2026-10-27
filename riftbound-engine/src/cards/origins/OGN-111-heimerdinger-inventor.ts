import { registerCard } from '../../engine/script';
import type { ActivatedDef } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Tenho todas as habilidades de exaurir ([Tap]) de todas as lendas, unidades e gear aliados.
// "Habilidades que elas têm": as impressas (e as do texto de efeito, via g.script) e também as concedidas por outra
// fonte (aura grantActivated, ex.: Forge of the Fluft dá "[Tap]: prender um Equipamento" às lendas aliadas).
registerCard({
  code: 'OGN-111',
  borrowedActivated: (g, self) => {
    const p = self.controller;
    const srcs = [...g.legendsOf(p), ...g.board().filter((o) => o.controller === p && o.id !== self.id && (g.isUnit(o) || g.isGear(o)))];
    const out: { from: Obj; index: number }[] = [];
    const seen = new Set<string>();
    const add = (from: Obj, a: ActivatedDef, index: number) => {
      const key = `${from.code}:${index}`;
      if (!a.exhaustSelf || seen.has(key)) return; // cópias da mesma habilidade são redundantes
      seen.add(key);
      out.push({ from, index });
    };
    const granters = g.auraSources().filter((s) => (g.script(s).auras || []).some((a) => a.grantActivated));
    for (const o of srcs) {
      if (!o) continue;
      (g.script(o).activated || []).forEach((a, index) => add(o, a, index));
      for (const src of granters)
        for (const au of g.script(src).auras || [])
          for (const k of au.grantActivated?.(g, src, o) || []) {
            const a = (g.script(src).activated || [])[k];
            if (a) add(src, a, k);
          }
    }
    return out;
  },
});
