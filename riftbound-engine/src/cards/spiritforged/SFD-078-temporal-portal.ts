import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// [Rune], [Tap]: Dê ao próximo spell que você jogar neste turno [Repeat] igual ao custo dele.
// - "Custo" = custo impresso (regra 206): um spell com desconto, ou jogado escondido por 0, ganha Repeat igual ao custo
//   impresso (FAQ riftjudge #8937 e #3469); os descontos valem para o custo total (base + Repeat), como sempre.
// - Spell que já tem Repeat fica com dois, pagos separadamente: três execuções (FAQ #1263 e #9763; regra 820.3).
// - O efeito acaba no próximo spell jogado, pague-se o Repeat ou não.
registerCard({
  code: 'SFD-078',
  activated: [
    {
      label: 'Dar Repeat ao próximo spell',
      cost: E(0, 'any'),
      exhaustSelf: true,
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, until: 'turn', nextPlay: 'spell', grantRepeat: 'printed' });
        c.g.say(`O próximo spell de ${c.g.pname(c.p)} neste turno tem Repeat igual ao seu custo.`, c.p);
      },
    },
  ],
});
