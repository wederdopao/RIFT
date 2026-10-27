import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Hidden. Quando você joga isto virado para baixo, equipe-o numa unidade sua (aqui). Equip [Caos].
// Errata de 14/01/2026: "(here)" entre parênteses lembra a restrição de Hidden — a unidade é alvo escolhido no campo
// onde a carta estava escondida (811.1.d.2; FAQ riftjudge #148). Não paga o Equip: o gatilho anexa direto (FAQ #10805).
// Sem unidade sua ali, o gatilho não vai para a pilha e o gear volta para a base na limpeza (457.1).
registerCard({
  code: 'SFD-139',
  keywords: { hidden: true },
  equipCost: E(0, 'Chaos'),
  triggers: [
    {
      on: 'play',
      label: 'Equipar numa unidade sua aqui',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.via === 'hidden',
      targets: [{ prompt: 'Edge of Night: equipar em qual unidade sua (aqui)?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && c.self.zone === 'board') c.g.attach(c.self, u, c.p);
      },
    },
  ],
});
