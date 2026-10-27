import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quando eu ataco ou defendo, cause dano igual ao meu Might a uma unidade inimiga aqui. Não causo dano de combate.
// [Mind]: [Action] — Mova-me para a sua base.
// - O alvo é escolhido ao pôr o gatilho na pilha; "aqui" é onde estou na resolução: se eu saí do campo, o alvo deixa de
//   ser válido e não há dano (FAQ riftjudge #11563). O dano usa o meu Might na resolução; fora do tabuleiro ele é nulo
//   (359.3.e.12).
// - "Mova-me para a sua base" é movimento, não recall: Vilemaw's Lair o impede (FAQ #1443).
registerCard({
  code: 'SFD-082',
  noCombatDamage: () => true,
  triggers: [
    {
      on: ['attack', 'defend'],
      label: 'Dano igual ao meu Might numa unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Ezreal: causar dano igual ao Might dele em qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.self.zone === 'board' && c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || c.self.zone !== 'board') return;
        const n = c.g.might(c.self);
        if (n > 0) c.g.dealDamage(u, n, c.self);
      },
    },
  ],
  activated: [
    {
      label: 'Mover-me para a base',
      cost: E(0, 'Mind'),
      timing: 'action',
      resolve: function* (c) {
        const me = c.self;
        if (me.zone !== 'board') return;
        const base = { t: 'base' as const, p: me.controller };
        if (!c.g.locEq(me.loc, base)) c.g.moveUnits([me], base, c.p);
      },
    },
  ],
});
