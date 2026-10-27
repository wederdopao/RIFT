import { registerCard } from '../../engine/script';

// Quando você me joga, você pode matar um gear aliado. Se fizer, você pode jogar da mão neste turno um gear com custo
// de energia até [7], ignorando o custo de energia (o power ainda é pago).
// - "Você pode" no início: decidido ao pôr na pilha (383.3.a); o gear aliado é alvo.
// - A permissão vale depois que a habilidade resolve, a qualquer momento do turno, para um gear só (FAQ riftjudge
//   #10269 e #10270). O limite olha o custo impresso; descontos não mudam isso nem se somam a ignorar o custo (FAQ
//   #12747, regra 206). O timing normal do gear continua valendo.
registerCard({
  code: 'SFD-084',
  onPlay: [
    {
      label: 'Matar um gear seu para jogar um gear sem pagar energia',
      optional: 'matar um gear seu?',
      targets: [{ prompt: 'Jayce: matar qual gear seu?', kind: 'gear', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const gear = c.targets[0][0];
        if (!gear) return;
        const dead = yield* c.g.killG(gear);
        if (!dead.length) return;
        c.g.addEffect({ player: c.p, until: 'turn', playPerm: { kind: 'gear', maxEnergy: 7 } });
        c.g.say(`${c.g.pname(c.p)} pode jogar neste turno um gear de custo até 7 da mão, ignorando o custo de energia.`, c.p);
      },
    },
  ],
});
