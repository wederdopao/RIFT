import { registerCard } from '../../engine/script';

// Revna the Lorekeeper. Ganking. Quando você joga um spell, se gastou [4] ou mais (de energia, para jogá-lo), me prepare.
// - "Quando você joga" dispara quando a jogada termina, na resolução (419.4.a); spell anulado não foi jogado.
// - A energia gasta é a paga ao jogar aquele spell (custos adicionais incluídos), gravada nele (data.spentE).
registerCard({
  code: 'UNL-005',
  keywords: { ganking: true },
  triggers: [
    {
      on: 'play',
      label: 'Me preparar (spell de [4] ou mais)',
      cond: (c, ev) => !!ev.spell && ev.player === c.p && (ev.obj?.data?.spentE || 0) >= 4,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.ready(c.self, c.p);
      },
    },
  ],
});
