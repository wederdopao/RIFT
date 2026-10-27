import { registerCard } from '../../engine/script';

// Hidden. Se uma unidade aliada fosse morrer, mate isto em vez disso. Cure a unidade, exaura-a e mande-a de volta
// para a base (recall, não é movimento).
// Vale para qualquer morte de unidade aliada, inclusive fichas e a morte do Temporary (que é "kill this", regra
// 816.1.b): a unidade salva continua com Temporary e morre de novo no próximo início de turno.
registerCard({
  code: 'OGN-077',
  keywords: { hidden: true },
  // substituição obrigatória (regras 369-373); com várias mortes simultâneas, salva uma, à escolha do controlador
  // (regra 373; RiftJudge #10615 e #10333)
  deathReplacements: [
    {
      label: 'destruir o Zhonya no lugar (a unidade volta curada e exausta para a base)',
      applies: (g, self, dying) => self.zone === 'board' && g.isUnit(dying) && dying.zone === 'board' && dying.controller === self.controller,
      apply: function* (g, self, dying) {
        g.say(`${g.name(self)} salva ${g.name(dying)}.`);
        if (self.zone === 'board') yield* g.killG(self, 'é destruída no lugar');
        dying.damage = 0;
        dying.exhausted = true;
        g.recall(dying);
        return true;
      },
    },
  ],
});
