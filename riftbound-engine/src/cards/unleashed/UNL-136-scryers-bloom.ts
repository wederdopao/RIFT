import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Gear. Entra exaurido. Matar isto, [1], [Tap]: [Predict 2], depois compre 1. Ganhe 1 XP.
// - Habilidade ativada sem Action/Reaction: fase principal do seu turno (806). Matar, pagar [1] e exaurir são o custo,
//   pagos ao ativar; a habilidade resolve pela pilha mesmo com o gear já no descarte.
// - Predict 2: olhar as 2 do topo, reciclar quaisquer delas e pôr o resto de volta em qualquer ordem (patch notes do
//   Unleashed).
registerCard({
  code: 'UNL-136',
  entersReady: () => false,
  activated: [
    {
      label: 'Matar, [1], exaurir: Predict 2, comprar 1 e ganhar 1 XP',
      cost: E(1),
      killSelf: true,
      exhaustSelf: true,
      resolve: function* (c) {
        yield* c.g.predict(c.p, 2);
        yield* c.g.draw(c.p, 1);
        c.g.gainXp(c.p, 1);
      },
    },
  ],
});
