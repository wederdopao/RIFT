import { registerCard } from '../../engine/script';

// Enquanto estou Mighty, tenho Deflect, Ganking e Shield.
// Camadas (regra 476.3, que usa esta carta de exemplo): a camada de habilidades vem antes da aritmética, então o
// Mighty é avaliado sem o Shield que esta habilidade dá — o Shield dela nunca a torna Mighty sozinho, e ao perder o
// buff ela vai direto de 6 para 4. Outras fontes de Shield/Might contam normalmente.
const evaluating = new Set<string>();
registerCard({
  code: 'OGN-232',
  kwMod: (g, self) => {
    if (evaluating.has(self.id)) return undefined;
    evaluating.add(self.id);
    try {
      return g.isMighty(self) ? { deflect: 1, ganking: true, shield: 1 } : undefined;
    } finally {
      evaluating.delete(self.id);
    }
  },
});
