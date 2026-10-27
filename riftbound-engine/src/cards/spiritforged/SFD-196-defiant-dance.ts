import { registerCard } from '../../engine/script';
// Reaction. Dê +2 de Might a uma unidade neste turno e -2 de Might a outra unidade neste turno.
// Dois alvos, unidades diferentes; cada parte só vale se o seu alvo continuar válido (regra 359.3.e.5).
registerCard({
  code: 'SFD-196',
  keywords: { reaction: true },
  spell: {
    label: 'Defiant Dance',
    targets: [
      { prompt: 'Defiant Dance: qual unidade recebe +2?' },
      { prompt: 'Defiant Dance: qual outra unidade recebe -2?', filter: (c, o) => !c.targets[0]?.some((x) => x.id === o.id) },
    ],
    resolve: function* (c) {
      const up = c.targets[0]?.[0];
      const down = c.targets[1]?.[0];
      if (up) c.g.giveMight(up, 2);
      if (down) c.g.giveMight(down, -2);
    },
  },
});
