import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import { E } from '../helpers';

// [Calm]: [Action] — Escolha uma unidade que você controla. Mova-me para o local dela e ela para o meu local original.
// Se ela estiver equipada, você pode anexar um dos Equipment dela a mim (sem pagar Equip: anexar não é equipar,
// RiftJudge FAQ #7575). Use só uma vez por turno.
// As instruções seguem a ordem do texto: primeiro os movimentos, depois o anexar (FAQ #11652). Movimento impedido
// (Vilemaw's Lair) é ignorado e o resto acontece (FAQ #9708). Cada cópia do texto (Svellsongur) tem o próprio
// "uma vez por turno".
const keyOf = (c: Ctx) => `azir:${c.gear?.id ?? 'impresso'}`; // cópia do Svellsongur: c.gear
registerCard({
  code: 'SFD-050',
  activated: [
    {
      label: '[Calm]: trocar de lugar com uma unidade sua (uma vez por turno)',
      cost: E(0, 'Calm'),
      timing: 'action',
      // "uma vez por turno", por instância do texto (precisa do contexto: c.gear)
      canPayExtra: (c) => (c.self.data || {})[keyOf(c)] !== `${c.g.turn}:${c.self.zoneVersion}`,
      targets: [{ prompt: 'Azir: escolha uma unidade que você controla', filter: (c, o) => o.controller === c.p }],
      // "uma vez por turno": conta ao ativar
      extraCost: function* (c) {
        (c.self.data ||= {})[keyOf(c)] = `${c.g.turn}:${c.self.zoneVersion}`;
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        const me = c.self;
        if (!u || u.zone !== 'board' || me.zone !== 'board') return;
        const mine = me.loc!;
        const its = u.loc!;
        if (!g.locEq(mine, its)) {
          g.moveUnits([me], its, c.p);
          g.moveUnits([u], mine, c.p);
        }
        if (u.zone !== 'board' || me.zone !== 'board') return;
        const eqs = g.equipmentOf(u);
        if (!eqs.length) return;
        const [eq] = yield* g.chooseObj(c.p, `Azir: anexar um Equipment de ${g.name(u)} a Azir? (opcional)`, eqs, 0, 1);
        if (eq) g.attach(eq, me, c.p);
      },
    },
  ],
});
