import { registerCard } from '../../engine/script';
// Campo: enquanto você controla este campo, os custos de [Repeat] aliados custam [1] a menos. É desconto no componente
// do Repeat (regra 356.4.c, motor: Aura.addCostMod com kind 'repeat'): só a parte de energia, nunca abaixo de 0.
registerCard({
  code: 'SFD-211',
  auras: [
    {
      addCostMod: (g, src, _card, p, kind) => {
        const i = g.bfOf(src);
        return kind === 'repeat' && i >= 0 && g.bfs[i].controller === p ? { energy: 1 } : undefined;
      },
    },
  ],
});
