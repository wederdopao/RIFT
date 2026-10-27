import { registerCard } from '../../engine/script';

// Action: você pode matar até um gear. Compre 1.
// "Até um" é alvo escolhido ao jogar (0 ou 1, regra 355.13); "você pode" matar é decidido na resolução, separado da
// escolha do alvo (regra 355.12).
registerCard({
  code: 'OGN-224',
  keywords: { action: true },
  spell: {
    label: 'Salvage',
    alwaysResolve: true,
    targets: [{ prompt: 'Salvage: escolher até um gear (você decide na resolução se o mata)', kind: 'gear', min: 0, max: 1 }],
    resolve: function* (c) {
      const g = c.g;
      const gear = c.targets[0]?.[0];
      if (gear && (yield* g.yesNo(c.p, `Salvage: matar ${g.name(gear)}?`))) yield* g.killG(gear);
      yield* g.draw(c.p, 1);
    },
  },
});
