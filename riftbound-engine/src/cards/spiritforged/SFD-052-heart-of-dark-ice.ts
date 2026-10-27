import { registerCard } from '../../engine/script';

// Exaurir: dê +3 de Might a uma unidade neste turno. (Sem [Reaction]: só no seu turno, fora de showdown e sem pilha.)
registerCard({
  code: 'SFD-052',
  activated: [
    {
      label: 'Exaurir: +3 de Might a uma unidade neste turno',
      exhaustSelf: true,
      targets: [{ prompt: 'Heart of Dark Ice: +3 de Might em qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 3);
      },
    },
  ],
});
