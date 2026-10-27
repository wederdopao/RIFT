import { registerCard } from '../../engine/script';

// Quando eu conquisto depois de um ataque, se você atribuiu 5 ou mais de dano excedente a unidades inimigas,
// você ganha 1 ponto.
// "Depois de um ataque": o controlador foi o atacante e eu participei do combate; só conta o dano excedente
// atribuído no passo de dano de combate (RiftJudge FAQ #223 e #7566).
registerCard({
  code: 'OGN-034',
  triggers: [
    {
      on: 'conquer',
      label: '5+ de dano excedente: ganhar 1 ponto',
      cond: (c, ev) =>
        ev.player === c.p && (ev.units || []).includes(c.self.id) && c.self.role === 'attacker' && (ev.excess || 0) >= 5,
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Tryndamere, Barbarian');
      },
    },
  ],
});
