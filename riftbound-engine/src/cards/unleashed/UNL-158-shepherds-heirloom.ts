import { registerCard } from '../../engine/script';
import { xpEquipExtra } from '../helpers';

// Quando você joga isto, ganhe 1 XP. [Equip] — Gaste 1 XP (anexe isto a uma unidade que você controla). Might Bonus +2.
// - Gastar XP é custo não de recursos (203.1; 730.2: reduzir o XP): vai em equipExtra. O Weaponmaster não reduz esta
//   parte (821.1.c.3: Equip sem [A] é pago inteiro; mesma lógica de RiftJudge #10704) e paga o XP inteiro.
// - Gastar XP: xpEquipExtra (núcleo de XP, evento spendXp).
registerCard({
  code: 'UNL-158',
  onPlay: [
    {
      label: 'Ganhar 1 XP',
      resolve: function* (c) {
        c.g.gainXp(c.p, 1, c.self);
      },
    },
  ],
  equipExtra: xpEquipExtra(1),
});
