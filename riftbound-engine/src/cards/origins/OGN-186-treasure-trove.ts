import { registerCard } from '../../engine/script';
import type { AbilityDef } from '../../engine/script';
import { E } from '../helpers';
// Quando isto sai do tabuleiro, compre 1 e canalize 1 runa exaurida. [Chaos], [Tap]: mate isto.
const leave: AbilityDef = {
  label: 'Comprar 1 e canalizar 1 runa exaurida',
  resolve: function* (c) {
    yield* c.g.draw(c.p, 1);
    c.g.channel(c.p, 1, true);
  },
};
registerCard({
  code: 'OGN-186',
  triggers: [
    // qualquer saída do tabuleiro: morrer, voltar à mão, banir, ir para o deck... (evento genérico 'leave')
    { ...leave, on: 'leave', zone: 'self', cond: (c, ev) => ev.obj?.id === c.self.id },
  ],
  activated: [
    {
      label: 'Matar isto',
      cost: E(0, 'Chaos'),
      exhaustSelf: true,
      killSelf: true,
      resolve: function* () {},
    },
  ],
});
