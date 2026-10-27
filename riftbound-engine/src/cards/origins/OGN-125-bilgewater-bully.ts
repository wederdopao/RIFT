import { registerCard } from '../../engine/script';

// Enquanto tenho Buff, tenho Ganking.
registerCard({ code: 'OGN-125', kwMod: (g, self) => (self.buffs > 0 ? { ganking: true } : undefined) });
