import { registerCard } from '../../engine/script';
// Enquanto você tem 8+ runas, tenho +4 de Might.
registerCard({
  code: 'OGS-004',
  mightMod: (g, self) => (g.runesOf(self.controller).length >= 8 ? 4 : 0),
});
