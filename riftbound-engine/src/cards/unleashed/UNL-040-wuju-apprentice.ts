import { registerCard } from '../../engine/script';

// [Hunt] (motor). [Level 6] Quando você me joga, compre 1.
// Gatilho dependente de Level: só dispara se já estiver ativo quando a condição acontece (727.1.c.1; 725.4) — ou seja,
// se você tem 6+ XP no momento em que me joga. Depois de ir para a pilha, o gatilho resolve normalmente.
registerCard({
  code: 'UNL-040',
  keywords: { hunt: 1 },
  triggers: [
    {
      on: 'play',
      label: 'Level 6: comprar 1',
      cond: (c, ev) => ev.obj?.id === c.self.id && c.g.levelReached(c.self, 6),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
