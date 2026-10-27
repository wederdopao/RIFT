import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. Equip [1][Fury]. Texto de efeito (da unidade equipada): as minhas habilidades de hold também são de
// conquista, e vice-versa.
// O motor dispara, junto com o hold/conquista, as habilidades do outro tipo da unidade e do que está equipado nela
// (Trinity Force: RiftJudge #10122, #8819; Reckoner's Arena: #7492, #9465). O +2 de Might é o bônus da carta.
registerCard({
  code: 'SFD-030',
  equipCost: E(1, 'Fury'),
  holdConquerAlias: true,
});
