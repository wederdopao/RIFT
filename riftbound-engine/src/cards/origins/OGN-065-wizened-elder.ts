import { registerCard } from '../../engine/script';

// Enquanto tenho Buff, tenho +1 de Might adicional.
registerCard({ code: 'OGN-065', mightMod: (g, self) => (self.buffs > 0 ? 1 : 0) });
