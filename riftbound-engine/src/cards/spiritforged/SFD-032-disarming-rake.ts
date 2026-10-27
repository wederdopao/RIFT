import { registerCard } from '../../engine/script';

// Quando você me joga, você pode matar um gear (qualquer gear; é alvo, regra 355.7). O "você pode" no início do
// efeito é decidido ao pôr o gatilho na pilha (regra 383.3.a).
registerCard({
  code: 'SFD-032',
  onPlay: [
    {
      label: 'Matar um gear',
      optional: 'matar um gear?',
      targets: [{ prompt: 'Disarming Rake: matar qual gear?', kind: 'gear' }],
      resolve: function* (c) {
        const gear = c.targets[0][0];
        if (gear && gear.zone === 'board') yield* c.g.killG(gear);
      },
    },
  ],
});
