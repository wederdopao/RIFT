import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Action, Repeat [2]. Atordoe (Stun) uma unidade inimiga atacante. Se ela já estiver atordoada, devolva-a para a mão do
// dono em vez disso.
// - A unidade é alvo, escolhida ao jogar: inimiga com a designação de atacante (combate em andamento). Na resolução ela
//   ainda tem de ser atacante (359.3.e).
// - "Já atordoada" é conferido na resolução de cada execução. Com o Repeat, a segunda execução faz as próprias escolhas e
//   pode escolher a mesma unidade (820.2.a): a 1ª a atordoa e a 2ª a devolve.
registerCard({
  code: 'UNL-134',
  keywords: { action: true },
  repeat: E(2),
  spell: {
    label: 'Existential Dread',
    targets: [{ prompt: 'Existential Dread: qual unidade inimiga atacante?', filter: (c, o) => o.controller !== c.p && o.role === 'attacker' }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      if (u.stunned) g.returnToHand(u);
      else g.stun(u, c.p);
    },
  },
});
