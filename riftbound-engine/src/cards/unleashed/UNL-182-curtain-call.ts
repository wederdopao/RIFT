import { registerCard, type Ctx, type TargetSpec } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { E } from '../helpers';
// Signature Spell (Jhin): [Repeat] [1] / [A] / [1][A]. Escolha um que você ainda não escolheu — compre 1; cause 2 a uma
// unidade num campo; cause 3 a uma unidade numa base; dê -4 de Might a uma unidade num campo neste turno.
// - São três instâncias de Repeat, pagas cada uma ou não, em qualquer combinação (820.3; RiftJudge #11289). Cada execução
//   escolhe o próprio modo ao jogar (355.3, 820.2.a; FAQ riftjudge #9763), sem repetir um modo já escolhido por outra.
// - Modo e alvo de cada execução ficam em c.data[`mode${c.rep}`]; o custo total pago (Repeat incluído) conta para o
//   "gastou [4] ou mais" do Jhin, Virtuoso (RiftJudge #10862).
type Mode = 'draw' | 'dmg2' | 'dmg3' | 'minus4';
const atBf = (c: Ctx, o: Obj) => c.g.bfIndex(o) >= 0;
const atBase = (c: Ctx, o: Obj) => c.g.locOf(o)?.t === 'base';
const SPECS: Record<Exclude<Mode, 'draw'>, TargetSpec> = {
  dmg2: { prompt: 'Curtain Call: 2 de dano em qual unidade num campo?', filter: atBf },
  dmg3: { prompt: 'Curtain Call: 3 de dano em qual unidade numa base?', filter: atBase },
  minus4: { prompt: 'Curtain Call: -4 de Might neste turno em qual unidade num campo?', filter: atBf },
};
const LABEL: Record<Mode, string> = {
  draw: 'Comprar 1',
  dmg2: 'Causar 2 a uma unidade num campo',
  dmg3: 'Causar 3 a uma unidade numa base',
  minus4: 'Dar -4 de Might a uma unidade num campo neste turno',
};
const chosenModes = (c: Ctx): Mode[] => Object.keys(c.data).filter((k) => /^mode\d+$/.test(k) && k !== `mode${c.rep}`).map((k) => c.data[k]);
registerCard({
  code: 'UNL-182',
  repeat: E(1),
  repeatMore: [E(0, 'any'), E(1, 'any')],
  spell: {
    label: 'Curtain Call',
    prepare: function* (c) {
      const g = c.g;
      const used = chosenModes(c);
      const modes = (['draw', 'dmg2', 'dmg3', 'minus4'] as Mode[]).filter((m) => !used.includes(m) && (m === 'draw' || g.targetCandidates(c, SPECS[m]).length > 0));
      if (!modes.length) return false;
      const [m] = yield* g.ask(c.p, 'choose', `Curtain Call${c.rep ? ` (${c.rep + 1}ª execução)` : ''}: escolha um modo que você ainda não escolheu`, modes.map((x) => ({ id: x, label: LABEL[x] })));
      c.data[`mode${c.rep}`] = m;
      return true;
    },
    // sem modo escolhido (conferir se dá para jogar): "comprar 1" não tem alvo e sempre vale
    targets: (c) => {
      const m = c.data[`mode${c.rep}`] as Mode | undefined;
      return m && m !== 'draw' ? [SPECS[m]] : [];
    },
    resolve: function* (c) {
      const g = c.g;
      const m = c.data[`mode${c.rep}`] as Mode;
      if (m === 'draw') return yield* g.draw(c.p, 1);
      const t = c.targets[0]?.[0];
      if (!t) return;
      if (m === 'dmg2') g.dealDamage(t, 2, c.self);
      else if (m === 'dmg3') g.dealDamage(t, 3, c.self);
      else g.giveMight(t, -4);
    },
  },
});
