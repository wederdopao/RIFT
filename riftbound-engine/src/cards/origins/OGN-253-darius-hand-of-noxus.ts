import { registerCard } from '../../engine/script';
// Lenda: [Tap] [Reaction], [Legion] – [Add] [1] (se você já jogou uma carta neste turno).
// O pagamento automático usa `adds`; ativada à mão, o motor põe 1 de energia no pool (regra 429).
registerCard({
  code: 'OGN-253',
  activated: [
    {
      label: 'Exaurir: adicionar 1 de energia (Legion)',
      exhaustSelf: true,
      timing: 'reaction',
      isAdd: true,
      adds: { energy: 1 },
      condition: (g, self) => g.legion(self, self.controller),
      // o motor põe no pool o que `adds` declara (também quando ativada à mão)
      resolve: function* () {},
    },
  ],
});
