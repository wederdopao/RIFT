import { registerCard } from '../../engine/script';

// [Ambush] (motor). As unidades inimigas aqui com menos Might do que eu não causam dano de combate.
// Quando eu seguro (hold), compre 1.
// A restrição é estática (Aura.noCombatDamage, conferida no passo de dano de combate com o Might atual, inclusive Shield
// e Assault). "Aqui" é o meu local.
registerCard({
  code: 'UNL-060',
  keywords: { ambush: true },
  auras: [
    {
      noCombatDamage: (g, src, u) =>
        u.controller !== src.controller && u.id !== src.id && g.bfIndex(src) >= 0 && g.locEq(u.loc, src.loc) && g.might(u) < g.might(src),
    },
  ],
  triggers: [
    {
      on: 'hold',
      label: 'Comprar 1',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
