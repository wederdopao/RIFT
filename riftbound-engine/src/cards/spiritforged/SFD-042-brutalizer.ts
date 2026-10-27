import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipment. [Equip][Calm]. Efeito: se isto foi anexado a mim neste turno, tenho +2 de Might a mais (o +1 do bônus de
// Might o motor já soma). Reequipar no mesmo turno não soma (RiftJudge FAQ #350, #9034); ao desanexar, some tudo
// (#11620). gear.attachedTurn = turno do último anexar (o atual, enquanto anexado).
registerCard({
  code: 'SFD-042',
  equipCost: E(0, 'Calm'),
  equipped: {
    mightMod: (g, gear) => (gear.attachedTurn === g.turn ? 2 : 0),
  },
});
