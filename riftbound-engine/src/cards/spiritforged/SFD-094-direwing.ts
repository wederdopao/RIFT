import { registerCard } from '../../engine/script';

// Entro pronta se você controla outro Dragon.
registerCard({
  code: 'SFD-094',
  entersReady: (g, self) =>
    g.board().some((o) => o.id !== self.id && o.controller === self.controller && g.data(o).tags.includes('Dragon')),
});
