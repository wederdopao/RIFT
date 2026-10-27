import { registerCard } from '../../engine/script';

// Deflect 2. Quando eu conquisto depois de um ataque, se você atribuiu 5 ou mais de dano excedente a unidades inimigas,
// você pode causar essa quantidade de dano a uma unidade inimiga.
// "Depois de um ataque": eu era atacante no combate; só conta o excedente atribuído no passo de dano de combate (como
// Tryndamere, Barbarian: FAQ riftjudge #223 e #7566). O alvo é escolhido ao pôr o gatilho na pilha.
registerCard({
  code: 'SFD-120',
  keywords: { deflect: 2 },
  triggers: [
    {
      on: 'conquer',
      label: '5+ de dano excedente: causar esse dano a uma unidade inimiga',
      optional: 'Causar o dano excedente a uma unidade inimiga?',
      cond: (c, ev) =>
        ev.player === c.p && (ev.units || []).includes(c.self.id) && c.self.role === 'attacker' && (ev.excess || 0) >= 5,
      targets: (c) => [{ prompt: `Sivir: ${c.ev?.excess} de dano em qual unidade inimiga?`, filter: (cc, o) => o.controller !== cc.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, c.ev!.excess, c.self);
      },
    },
  ],
});
