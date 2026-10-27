import { registerCard } from '../../engine/script';

// Jhin, Murderous Artist. Deflect, Ganking. Quando eu me movo, [Add] [1][A].
// - Qualquer movimento (padrão ou por efeito; ser chamado de volta não é movimento). Gatilho de [Add]: resolve assim que
//   finalizado, sem pilha e sem passar prioridade/Focus (429.2; motor: TriggerDef.immediate).
registerCard({
  code: 'UNL-022',
  keywords: { deflect: 1, ganking: true },
  triggers: [
    {
      on: 'move',
      label: '[Add] [1][A]',
      immediate: true,
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        c.g.addResources(c.p, 1, ['any']);
      },
    },
  ],
});
