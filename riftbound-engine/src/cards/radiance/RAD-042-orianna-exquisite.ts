import { registerCard } from '../../engine/script';

// Shield. Não causo dano de combate a menos que haja um gear aliado aqui.
registerCard({
  code: 'RAD-042',
  keywords: { shield: 1 },
  noCombatDamage: (g, self) => {
    const loc = g.locOf(self);
    return !g.gearOf(self.controller).some((o) => g.locEq(g.locOf(o), loc));
  },
});
