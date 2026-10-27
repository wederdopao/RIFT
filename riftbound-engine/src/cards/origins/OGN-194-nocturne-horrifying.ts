import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Ganking. Ao me olhar ou revelar no topo do seu deck, você pode me banir. Se fizer, pode me jogar por [Rune].
// Vale para todo efeito que olha ou revela o topo do deck principal: todos devem passar por Engine.lookAtTop
// (Vision/Predict, Stacked Deck; e as cartas de outros lotes que olham/revelam o topo).
// "Por [Rune]" troca o custo base (regra 356.1.a); custos opcionais (Accelerate etc.) ainda podem ser pagos.
registerCard({
  code: 'OGN-194',
  keywords: { ganking: true },
  onLookTop: function* (g, self, p) {
    if (!(yield* g.yesNo(p, 'Nocturne está no topo do seu deck. Bani-lo para poder jogá-lo por 1 power?'))) return;
    g.banishObj(self);
    const cost = E(0, 'any');
    if (!g.canPay(p, cost)) {
      g.say('Sem power para jogar Nocturne: ele fica banido.', p);
      return;
    }
    if (yield* g.yesNo(p, 'Jogar Nocturne por 1 power?')) yield* g.playFromEffect(p, self, cost);
  },
});
