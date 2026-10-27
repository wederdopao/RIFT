import { registerCard } from '../../engine/script';

// Weaponmaster. Quando eu conquisto um campo que estava sem controlador, cause dano igual ao meu Might a uma unidade
// inimiga numa base.
// Errata (FAQ oficial do Spiritforged): vale o controle do campo logo antes da conquista; dispara também no fim de um
// showdown sem combate e em "defesas surpresa". O alvo é escolhido ao pôr o gatilho na pilha; o dano usa o Might na
// resolução (se eu saí do tabuleiro, meu Might é nulo e não há dano: regra 359.3.e.12).
registerCard({
  code: 'SFD-116',
  keywords: { weaponmaster: true },
  triggers: [
    {
      on: 'conquer',
      label: 'Conquista de campo sem controlador: dano a uma unidade inimiga numa base',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id) && ev.prevController === null,
      targets: [{ prompt: 'Yone: dano em qual unidade inimiga numa base?', filter: (c, o) => o.controller !== c.p && c.g.locOf(o)?.t === 'base' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || c.self.zone !== 'board') return;
        c.g.dealDamage(u, Math.max(0, c.g.might(c.self)), c.self);
      },
    },
  ],
});
