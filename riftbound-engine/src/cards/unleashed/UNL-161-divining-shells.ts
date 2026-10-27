import { registerCard } from '../../engine/script';

// [Vision] (quando você joga isto, olhe o topo do Main Deck; pode reciclá-la).
// [Action][>] Mate isto, [Tap]: Dê +2 de Might a uma unidade neste turno.
// Matar e exaurir são o custo (pagos ao finalizar); a unidade é alvo escolhido ao ativar.
registerCard({
  code: 'UNL-161',
  keywords: { vision: 1 },
  activated: [
    {
      label: '+2 de Might numa unidade neste turno',
      timing: 'action',
      killSelf: true,
      exhaustSelf: true,
      targets: [{ prompt: 'Divining Shells: +2 de Might em qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 2);
      },
    },
  ],
});
