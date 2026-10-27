import { registerCard } from '../../engine/script';
import { xpCost } from '../helpers';

// Unidade 6. Gastar 3 XP: dê [Ganking] às suas unidades aqui neste turno.
// - Habilidade ativada sem Action/Reaction: só na fase principal do seu turno, com o estado aberto (806). Gastar XP é o
//   custo (203.1, 730.2), pago ao ativar.
// - "Aqui" é o local do Megatusk na resolução (patch notes do Unleashed, Referents); se ele saiu do tabuleiro, não há
//   "aqui" e nada acontece (359.3.e.12). As unidades são as suas que estão lá na resolução; as que chegarem depois não
//   ganham.
registerCard({
  code: 'UNL-126',
  activated: [
    {
      label: 'Gastar 3 XP: suas unidades aqui ganham Ganking neste turno',
      ...xpCost(3),
      resolve: function* (c) {
        const g = c.g;
        const self = c.self;
        if (self.zone !== 'board' || !self.loc) return;
        const here = g.unitsAt(self.loc).filter((u) => u.controller === c.p);
        for (const u of here) g.giveKw(u, { ganking: true });
        g.say(`${here.map((u) => g.name(u)).join(', ') || 'Nenhuma unidade'} ganha(m) Ganking neste turno.`, c.p);
      },
    },
  ],
});
