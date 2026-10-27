import { registerCard } from '../../engine/script';

// Enquanto você tiver outra unidade aqui, tenho +1 de Might. "Aqui" é o meu local, inclusive a base
// (riftjudge FAQ #7494; regra 462.2.b).
registerCard({
  code: 'SFD-159',
  mightMod: (g, self) =>
    g.units().some((u) => u.id !== self.id && u.controller === self.controller && g.locEq(u.loc, self.loc)) ? 1 : 0,
});
