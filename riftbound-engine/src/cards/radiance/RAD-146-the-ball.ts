import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
// RAD-146 The Ball
// [Deploy] [Ganking] (só vale enquanto é unidade: movimento padrão de campo a campo).
// "When you play or move this, choose one — Draw 1. / Deal 2 to enemy units here." O gatilho de mover só acontece
// quando ela é unidade (unit gear, Lady of Clockwork): gear que não é unidade não se move.
const mode = {
  label: 'The Ball: comprar 1 ou 2 de dano nas unidades inimigas aqui',
  prepare: function* (c: Ctx) {
    const [m] = yield* c.g.ask(c.p, 'choose', 'The Ball: escolha um', [
      { id: 'draw', label: 'Comprar 1' },
      { id: 'dmg', label: 'Causar 2 às unidades inimigas aqui' },
    ]);
    c.data.mode = m;
    return true;
  },
  resolve: function* (c: Ctx) {
    const g = c.g;
    if (c.data.mode === 'draw') {
      yield* g.draw(c.p, 1);
      return;
    }
    const l = g.locOf(c.self);
    if (!l || c.self.zone !== 'board') return;
    for (const u of g.unitsAt(l).filter((x) => x.controller !== c.p)) g.dealDamage(u, 2, c.self);
  },
};
registerCard({
  code: 'RAD-146',
  keywords: { deploy: true, ganking: true },
  onPlay: [mode],
  triggers: [{ ...mode, on: 'move', cond: (c, ev) => ev.unit?.id === c.self.id && ev.mover === c.p }],
});
