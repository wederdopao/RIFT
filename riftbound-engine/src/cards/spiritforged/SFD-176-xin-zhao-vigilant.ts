import { registerCard } from '../../engine/script';

// Tank. Entro pronta se você tiver duas ou mais outras unidades na sua base.
registerCard({
  code: 'SFD-176',
  keywords: { tank: true },
  entersReady: (g, self) => g.unitsAt({ t: 'base', p: self.controller }).filter((u) => u.id !== self.id).length >= 2,
});
