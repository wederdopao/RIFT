import { registerCard } from '../../engine/script';
import { E, xpCost } from '../helpers';

// Quando você joga uma unidade, você pode pagar [1] para ganhar 1 XP.
// Gaste 3 XP, [Tap]: Prepare uma unidade.
// - "Você pode pagar [1] para..." no início: o custo é pago ao pôr o gatilho na pilha (383.3.b; riftboundfaq.com,
//   Abilities #costs-within-instructions); recusar = não disparou. Fichas de unidade também são jogadas (185.2.a).
// - A ativada não tem palavra-chave de timing: fase principal do seu turno. A unidade é alvo (qualquer unidade).
registerCard({
  code: 'UNL-109',
  triggers: [
    {
      on: 'play',
      label: 'Pagar [1] para ganhar 1 XP',
      optional: 'Pagar [1] para ganhar 1 XP?',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && c.g.isUnit(ev.obj),
      cost: E(1),
      resolve: function* (c) {
        c.g.gainXp(c.p, 1, c.self);
      },
    },
  ],
  activated: [
    {
      ...xpCost(3),
      label: 'Gastar 3 XP e exaurir: preparar uma unidade',
      exhaustSelf: true,
      targets: [{ prompt: 'Blood Rose: preparar qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.ready(u, c.p);
      },
    },
  ],
});
