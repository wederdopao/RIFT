import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Action. Repeat [1]. Dê [Assault 2] a uma unidade neste turno (errata de 14/01/2026: "neste turno").
// Com Repeat a segunda execução escolhe o próprio alvo (pode ser a mesma unidade: os valores de Assault somam, 807.2).
registerCard({
  code: 'SFD-003',
  keywords: { action: true },
  repeat: E(1),
  spell: {
    label: 'Blood Rush',
    targets: [{ prompt: 'Blood Rush: dar [Assault 2] a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      c.g.giveKw(u, { assault: 2 });
      c.g.say(`${c.g.name(u)} recebe [Assault 2] neste turno.`, c.p);
    },
  },
});
