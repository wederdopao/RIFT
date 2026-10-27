import { registerCard } from '../../engine/script';

// Tenho +2 de Might enquanto ataco junto com outra unidade.
// (O cards.json perdeu o ícone: na carta impressa é "+2 [Might]".) "Atacando com outra unidade" = sou atacante e
// existe outra unidade atacante no mesmo combate (mesmo campo, designação de atacante; 461/462).
registerCard({
  code: 'UNL-154',
  mightMod: (g, self) => {
    if (self.role !== 'attacker') return 0;
    const i = g.bfIndex(self);
    if (i < 0) return 0;
    return g.unitsAtBf(i).some((u) => u.id !== self.id && u.role === 'attacker') ? 2 : 0;
  },
});
