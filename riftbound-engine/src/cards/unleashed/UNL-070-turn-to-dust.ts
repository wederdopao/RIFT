import { registerCard } from '../../engine/script';

// Dê [Temporary] a um gear (de qualquer jogador). Sem "neste turno": dura enquanto o gear estiver no tabuleiro.
// Equipamento anexado com o Temporary dado também morre: palavra-chave dada continua ativa (FAQ oficial do Unleashed,
// "Unleashed Rules FAQ and Clarifications", 29/04/2026; regra 135.4.b) — Engine.activeKw conta os efeitos dados.
registerCard({
  code: 'UNL-070',
  spell: {
    label: 'Turn to Dust',
    targets: [{ prompt: 'Turn to Dust: dar [Temporary] a qual gear?', kind: 'gear' }],
    resolve: function* (c) {
      const g = c.g;
      const o = c.targets[0][0];
      if (!o || o.zone !== 'board') return;
      g.addEffect({ target: o.id, kw: { temporary: true }, until: 'perm' });
      g.say(`${g.name(o)} ganha [Temporary].`, c.p);
    },
  },
});
