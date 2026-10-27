import { registerCard } from '../../engine/script';

// [Reaction]. Dê +1 de Might a uma unidade neste turno. [Level 6] Dê +3 a ela neste turno em vez disso.
// Level é palavra-chave dependente (824.1, 727.1.b): a instrução de Level só está ativa enquanto o controlador tem 6+ XP
// (824.1.c-d; texto inativo não é processado, 721.2). Num spell as instruções são executadas na resolução (359.3.d),
// então o XP é conferido ao resolver. "Em vez disso" troca o +1 pelo +3 (não somam).
registerCard({
  code: 'UNL-031',
  keywords: { reaction: true },
  spell: {
    label: 'Combat Experience',
    targets: [{ prompt: 'Combat Experience: dar Might a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, c.g.level(c.p, 6) ? 3 : 1);
    },
  },
});
