import { registerCard } from '../../engine/script';

// Minha Might aumenta pelos seus pontos.
registerCard({
  code: 'OGN-028',
  mightMod: (g, self) => g.pl[self.controller].points,
});
