import { registerCard, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { E } from '../helpers';

// Repeat [4][Mind]. Escolha um — Cause 4 de dano a uma unidade numa base. / Mate um gear.
// O modo é escolhido ao jogar (regra 355.3) e cada execução do Repeat escolhe o seu (820.2.a: pode repetir o modo e o
// alvo ou não). Guardado por execução em c.data[`mode${c.rep}`]. Com Temporal Portal são três execuções (FAQ riftjudge
// #9763).
const atBase = (c: Ctx, o: Obj) => c.g.isUnit(o) && c.g.locOf(o)?.t === 'base';
const SPECS = {
  dmg: { prompt: 'Rocket Barrage: 4 de dano em qual unidade numa base?', filter: atBase },
  kill: { prompt: 'Rocket Barrage: matar qual gear?', kind: 'gear' as const },
};
registerCard({
  code: 'SFD-077',
  repeat: E(4, 'Mind'),
  spell: {
    label: 'Rocket Barrage',
    prepare: function* (c) {
      const g = c.g;
      const ok = (m: 'dmg' | 'kill') => g.targetCandidates(c, SPECS[m]).length > 0;
      const modes = (['dmg', 'kill'] as const).filter(ok);
      if (!modes.length) return false;
      const label = { dmg: 'Causar 4 de dano a uma unidade numa base', kill: 'Matar um gear' };
      const [m] = yield* g.ask(c.p, 'choose', `Rocket Barrage${c.rep ? ` (${c.rep + 1}ª execução)` : ''}: escolha um modo`, modes.map((x) => ({ id: x, label: label[x] })));
      c.data[`mode${c.rep}`] = m;
      return true;
    },
    targets: (c) => {
      const m = c.data[`mode${c.rep}`] as 'dmg' | 'kill' | undefined;
      if (m) return [SPECS[m]];
      // modo ainda não escolhido (conferir se a carta pode ser jogada): vale qualquer alvo de um dos modos
      return [{ prompt: '', kind: 'permanent', filter: (cc, o) => atBase(cc, o) || cc.g.isGear(o) }];
    },
    resolve: function* (c) {
      const t = c.targets[0][0];
      if (!t) return;
      if (c.data[`mode${c.rep}`] === 'dmg') c.g.dealDamage(t, 4, c.self);
      else yield* c.g.killG(t);
    },
  },
});
