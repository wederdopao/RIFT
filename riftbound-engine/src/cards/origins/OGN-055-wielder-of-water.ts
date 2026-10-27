import { registerCard } from '../../engine/script';

// Enquanto ataco ou defendo sozinha, tenho +2 de Might.
registerCard({
  code: 'OGN-055',
  mightMod: (g, self) => (self.role && g.isAlone(self) ? 2 : 0),
});
