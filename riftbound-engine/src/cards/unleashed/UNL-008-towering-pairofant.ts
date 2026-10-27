import { registerCard } from '../../engine/script';

// Towering Pairofant. Assault. Se uma unidade morreu neste turno (de qualquer jogador, fichas incluídas), entro pronta.
registerCard({
  code: 'UNL-008',
  keywords: { assault: 1 },
  entersReady: (g) => (g.pl[0].unitDeaths || 0) + (g.pl[1].unitDeaths || 0) > 0,
});
