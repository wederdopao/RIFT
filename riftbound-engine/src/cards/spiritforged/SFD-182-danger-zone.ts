import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Reaction. [Repeat] [1][A] (o símbolo é o arco-íris, power de qualquer domínio: api.riftcodex.com).
// Dê +1 de Might às suas Mechs neste turno. "Suas Mechs" são as que você controla quando o efeito resolve (cada
// execução do Repeat dá +1 de novo).
registerCard({
  code: 'SFD-182',
  keywords: { reaction: true },
  repeat: E(1, 'any'),
  spell: {
    label: 'Danger Zone',
    resolve: function* (c) {
      const g = c.g;
      const mechs = g.units().filter((u) => u.controller === c.p && g.hasTag(u, 'Mech'));
      for (const u of mechs) g.giveMight(u, 1);
      if (!mechs.length) g.say('Danger Zone: nenhuma Mech sua no tabuleiro.', c.p);
    },
  },
});
