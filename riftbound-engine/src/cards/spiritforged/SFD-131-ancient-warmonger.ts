import { registerCard } from '../../engine/script';

// Accelerate. Tenho Assault igual ao número de unidades inimigas aqui (+1 de Might como atacante por instância).
// "Aqui" é o meu local (campo ou base).
registerCard({
  code: 'SFD-131',
  keywords: { accelerate: true },
  kwMod: (g, self) => {
    if (self.zone !== 'board' || !self.loc) return undefined;
    const n = g.unitsAt(self.loc).filter((u) => u.controller !== self.controller).length;
    return n > 0 ? { assault: n } : undefined;
  },
});
