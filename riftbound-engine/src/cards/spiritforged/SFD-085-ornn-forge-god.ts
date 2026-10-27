import { registerCard } from '../../engine/script';

// Deflect 2. Weaponmaster. Tenho +1 de Might para cada gear aliado (fichas e gear anexados contam).
registerCard({
  code: 'SFD-085',
  keywords: { deflect: 2, weaponmaster: true },
  mightMod: (g, self) => g.gearOf(self.controller).length,
});
