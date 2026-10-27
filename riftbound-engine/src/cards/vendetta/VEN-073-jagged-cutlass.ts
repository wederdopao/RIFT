import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// VEN-073 Jagged Cutlass — texto de efeito: "I can't be moved by enemy spells and abilities." (Aura.blockMove com `by`:
// quem move por spell/habilidade; o movimento padrão e efeitos do próprio controlador continuam valendo)
registerCard({
  code: 'VEN-073',
  equipCost: E(0, 'Body'),
  equipped: {
    auras: [{ blockMove: (g, self, u, from, to, by) => u.id === self.id && by !== null && by !== self.controller }],
  },
});
