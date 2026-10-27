import { registerCard } from '../../engine/script';
import { youHere } from '../helpers';
// Campo: enquanto você controla este campo, quando você joga um spell, se você gastou [4] ou mais, [Predict] (olhe a carta
// do topo do seu deck; você pode reciclá-la).
// - Dispara quando a jogada do spell termina (419.4.a); spell anulado não conta. "Gastou [4] ou mais" = energia paga de
//   fato pelo spell (o.data.spentE (g.noteSpellEnergy); RiftJudge #11727). "Você" = quem controla o campo (190.6.d).
registerCard({
  code: 'UNL-211',
  triggers: [
    {
      on: 'play',
      label: 'Predict',
      cond: (c, ev) => !!ev.spell && youHere(c, ev.player) && ev.player === c.p && (ev.obj?.data?.spentE ?? 0) >= 4,
      resolve: function* (c) {
        yield* c.g.predict(c.p, 1);
      },
    },
  ],
});
