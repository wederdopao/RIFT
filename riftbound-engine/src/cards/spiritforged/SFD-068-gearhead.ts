import { registerCard, type Aura } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Accelerate. Cada Equipment anexado a mim dá o dobro do seu Might Bonus base.
// "Dá o dobro" (não é a ação "dobrar"): o Might Bonus impresso conta duas vezes (notas do patch do Spiritforged).
// Só o bônus base dobra; bônus condicionais do equipamento não (FAQ riftjudge #11341, #8493). O motor já soma o
// Might Bonus uma vez (regra 434.1.d); aqui entra a outra.
// Efeitos de dobrar idênticos não se acumulam: com o meu texto copiado por Svellsongur, o bônus continua só dobrado
// (FAQ riftjudge #8493 e #11629). Por isso é uma aura sobre mim mesma: a cópia (texto de efeito, que recebe o
// equipamento como último argumento) só vale se for a única instância — eu sem o texto impresso e ela a primeira cópia.
const DOUBLE: Aura = {
  might: (g, src, t, gear?: Obj) => {
    if (src.id !== t.id || src.zone !== 'board') return 0;
    if (gear) {
      if (g.baseScript(src).auras?.includes(DOUBLE)) return 0;
      const first = g.attachedTo(src).find((x) => g.effectTextOf(x, src)?.auras?.includes(DOUBLE));
      if (first?.id !== gear.id) return 0;
    }
    return g.attachedTo(src).reduce((s, eq) => s + (g.hasTag(eq, 'Equipment') ? g.data(eq).mightBonus : 0), 0);
  },
};
registerCard({
  code: 'SFD-068',
  keywords: { accelerate: true },
  auras: [DOUBLE],
});
